import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { aiShorthandRecords, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { ErrorCodes, createErrorResponse } from "@/lib/api-errors";
import { getFileUrl, uploadObject } from "@/lib/s3";

export const runtime = "nodejs";

const AUDIO_MIME_EXTENSION_MAP: Record<string, string> = {
  "audio/webm": "webm",
  "audio/webm;codecs=opus": "webm",
  "audio/ogg": "ogg",
  "audio/ogg;codecs=opus": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
};

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return createErrorResponse({
        status: 401,
        error: "未授权",
        errorCode: ErrorCodes.UNAUTHORIZED,
      });
    }

    const { id: recordId } = await params;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId));

    if (!user) {
      return createErrorResponse({
        status: 404,
        error: "用户不存在",
        errorCode: ErrorCodes.USER_NOT_FOUND,
      });
    }

    const [record] = await db
      .select()
      .from(aiShorthandRecords)
      .where(
        and(eq(aiShorthandRecords.id, recordId), eq(aiShorthandRecords.userId, user.id))
      );

    if (!record) {
      return createErrorResponse({
        status: 404,
        error: "记录不存在",
        errorCode: ErrorCodes.DOCUMENT_NOT_FOUND,
      });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error("解析录音上传表单失败:", error);
      return createErrorResponse({
        status: 400,
        error: "录音上传失败，请检查请求格式",
        errorCode: ErrorCodes.INVALID_FORM_DATA,
      });
    }

    const audioFile = formData.get("file");
    const durationValue = formData.get("duration");
    const language = formData.get("language");

    if (!audioFile || typeof audioFile === "string") {
      return createErrorResponse({
        status: 400,
        error: "缺少音频文件",
        errorCode: ErrorCodes.MISSING_AUDIO_FILE,
      });
    }

    if (audioFile.type && !audioFile.type.startsWith("audio/")) {
      return createErrorResponse({
        status: 400,
        error: "文件格式不支持，请上传音频文件",
        errorCode: ErrorCodes.INVALID_FORM_DATA,
      });
    }

    const parsedDuration =
      typeof durationValue === "string" ? Number.parseInt(durationValue, 10) : undefined;
    const duration =
      typeof parsedDuration === "number" && Number.isFinite(parsedDuration)
        ? parsedDuration
        : undefined;

    const arrayBuffer = await audioFile.arrayBuffer();
    const mimeType = audioFile.type || "audio/webm";
    const extension = resolveAudioExtension(audioFile, mimeType);
    const filename = audioFile.name || `recording.${extension}`;

    let audioUrl: string | undefined;
    try {
      const key = `ai-shorthand/${recordId}/${uuidv4()}.${extension}`;
      await uploadObject({
        key,
        body: Buffer.from(arrayBuffer),
        contentType: mimeType,
      });
      audioUrl = getFileUrl(key);
    } catch (uploadError) {
      console.error("录音上传到存储失败:", uploadError);
    }

    const transcript = await transcribeAudio({
      buffer: arrayBuffer,
      filename,
      mimeType,
      language: typeof language === "string" ? language : undefined,
    });

    return NextResponse.json({
      transcript,
      audioUrl,
      duration,
    });
  } catch (error) {
    console.error("处理录音转写失败:", error);
    const errorCode =
      error instanceof Error && error.message.includes("SILICONFLOW_API_KEY")
        ? ErrorCodes.MISSING_SILICONFLOW_API_KEY
        : ErrorCodes.STT_API_ERROR;

    return createErrorResponse({
      status: 500,
      error: "录音转写失败，请稍后重试",
      errorCode,
    });
  }
}

function resolveAudioExtension(file: File, mimeType: string) {
  const name = file.name ?? "";
  if (name.includes(".")) {
    return name.split(".").pop() || "webm";
  }

  return AUDIO_MIME_EXTENSION_MAP[mimeType] ?? "webm";
}

async function transcribeAudio(params: {
  buffer: ArrayBuffer;
  filename: string;
  mimeType: string;
  language?: string;
}) {
  const apiKey = process.env.SILICONFLOW_API_KEY;

  if (!apiKey) {
    throw new Error("缺少 SILICONFLOW_API_KEY 环境变量");
  }

  const baseUrl =
    process.env.SILICONFLOW_STT_BASE_URL ??
    process.env.SILICONFLOW_BASE_URL ??
    "https://api.siliconflow.cn";
  const model = process.env.SILICONFLOW_STT_MODEL ?? "whisper-1";

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([params.buffer], { type: params.mimeType }),
    params.filename
  );
  formData.append("model", model);
  formData.append("response_format", "json");
  if (params.language) {
    formData.append("language", params.language);
  }

  const response = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `语音转写接口调用失败: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  const rawBody = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const json = JSON.parse(rawBody) as {
        text?: string;
        transcript?: string;
      };
      const text = json.text ?? json.transcript ?? "";
      if (text) return text;
    } catch (error) {
      console.error("解析转写 JSON 失败:", error);
    }
  }

  const fallbackText = rawBody.trim();
  if (!fallbackText) {
    throw new Error("语音转写返回内容为空");
  }

  return fallbackText;
}
