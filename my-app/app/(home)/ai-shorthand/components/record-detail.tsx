
"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { 
    MicIcon, 
    StopCircleIcon, 
    SparklesIcon, 
    AlignLeftIcon, 
    FileEditIcon, 
    MoreHorizontalIcon,
    type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Record } from "../page";

interface RecordDetailProps {
  record: Record;
  onUpdate: (updates: Partial<Record>) => void;
}

type Tab = "summary" | "notes" | "transcript";

export function RecordDetail({ record, onUpdate }: RecordDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [elapsed, setElapsed] = useState(record.duration);
  const [isRecording, setIsRecording] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(
    record.audioUrl ?? null
  );
  const [processingError, setProcessingError] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const objectUrlRef = useRef<string | null>(null);

  const setPlaybackUrlSafely = (url: string | null, isObjectUrl = false) => {
    if (objectUrlRef.current && objectUrlRef.current !== url) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (isObjectUrl) {
      objectUrlRef.current = url;
    }

    setPlaybackUrl(url);
  };

  const cleanupRecorder = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.onerror = null;
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    chunksRef.current = [];
  };

  // 录音计时器
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) {
      setElapsed(record.duration);
    }
  }, [isRecording, record.duration]);

  useEffect(() => {
    setProcessingError(null);
    setIsRecording(false);
    cleanupRecorder();
    setPlaybackUrlSafely(record.audioUrl ?? null);
  }, [record.id, record.audioUrl]);

  useEffect(() => {
    return () => {
      cleanupRecorder();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const supportsRecording =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof MediaRecorder !== "undefined";

  const resolveMimeType = () => {
    if (!supportsRecording) return "";
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "audio/mp4",
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
  };

  const handleStartRecording = async () => {
    if (!supportsRecording) {
      setProcessingError("当前浏览器不支持录音功能");
      return;
    }

    try {
      setProcessingError(null);
      cleanupRecorder();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = resolveMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      streamRef.current = stream;
      setIsRecording(true);
      setElapsed(0);
      onUpdate({ status: "recording", duration: 0 });
    } catch (error) {
      console.error("启动录音失败:", error);
      setProcessingError("无法启动录音，请检查麦克风权限");
      cleanupRecorder();
    }
  };

  const stopRecordingAndGetBlob = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      throw new Error("录音未启动");
    }

    return new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        cleanupRecorder();
        resolve(blob);
      };

      recorder.onerror = () => {
        cleanupRecorder();
        reject(new Error("录音停止失败"));
      };

      if (recorder.state !== "inactive") {
        recorder.stop();
      } else {
        cleanupRecorder();
        reject(new Error("录音已停止"));
      }
    });
  };

  // 停止录音并开始处理
  const handleStopRecording = async () => {
    onUpdate({ status: "processing", duration: elapsed });
    setIsRecording(false);
    setProcessingError(null);

    try {
      const audioBlob = await stopRecordingAndGetBlob();
      const objectUrl = URL.createObjectURL(audioBlob);
      setPlaybackUrlSafely(objectUrl, true);

      const formData = new FormData();
      formData.append(
        "file",
        audioBlob,
        `recording-${record.id}.webm`
      );
      formData.append("duration", String(elapsed));

      const transcribeRes = await fetch(
        `/api/ai-shorthand/${record.id}/transcribe`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!transcribeRes.ok) {
        throw new Error("Transcription failed");
      }

      const transcribeData = await transcribeRes.json();
      const transcript = transcribeData.transcript as string;
      const audioUrl = transcribeData.audioUrl as string | undefined;
      const duration = transcribeData.duration as number | undefined;

      if (!transcript) {
        throw new Error("Empty transcript");
      }

      if (audioUrl) {
        setPlaybackUrlSafely(audioUrl);
      }

      const updates: Partial<Record> = {
        transcript,
        duration: duration ?? elapsed,
      };
      if (audioUrl) {
        updates.audioUrl = audioUrl;
      }

      onUpdate(updates);

      // 2. 调用 AI 总结
      await generateSummary(transcript);
    } catch (error) {
      console.error("Processing failed:", error);
      setProcessingError("录音处理失败，请重试");
      onUpdate({
        status: "completed",
        summary: "处理过程中发生错误，请重试。",
        notes: "无法生成笔记。",
      });
    }
  };

  const generateSummary = async (text: string) => {
    try {
      if (!text.trim()) {
        onUpdate({
          status: "completed",
          summary: "暂无可总结的转录内容。",
          notes: "暂无笔记。",
        });
        return;
      }

      // 调用真实的 AI 接口
      const response = await fetch("/api/chat/robot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            messages: [{ role: "user", content: text }],
            action: "summarize",
            mode: "edit"
        })
      });

      if (!response.ok) throw new Error("API call failed");
      
      const data = await response.json();

      setProcessingError(null);
      
      onUpdate({
        status: "completed",
        summary: data.reply || "无法生成摘要",
        notes: "基于录音内容的智能笔记:\n" + (data.reply || "暂无笔记")
      });
      
    } catch (error) {
       console.error("Summary generation failed:", error);
       onUpdate({
        status: "completed",
        summary: "生成摘要失败，请检查 API 配置。",
        notes: "生成笔记失败。"
    });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b flex-shrink-0">
        <div className="flex items-start justify-between mb-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight mb-1">
                    {record.title}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary" className="font-normal text-xs">
                        AI 速记
                    </Badge>
                    <span>•</span>
                    <span>{format(record.date, "yyyy年MM月dd日 HH:mm")}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                {record.status === "recording" ? (
                  isRecording ? (
                    <Button
                      variant="destructive"
                      onClick={handleStopRecording}
                      className="animate-pulse"
                    >
                      <StopCircleIcon className="w-4 h-4 mr-2" />
                      停止录音 ({Math.floor(elapsed / 60)}:
                      {(elapsed % 60).toString().padStart(2, "0")})
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      onClick={handleStartRecording}
                      disabled={!supportsRecording}
                    >
                      <MicIcon className="w-4 h-4 mr-2" />
                      开始录音
                    </Button>
                  )
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    {record.status === "processing" ? "处理中..." : "录音完成"}
                  </Button>
                )}
                <Button variant="ghost" size="icon">
                    <MoreHorizontalIcon className="w-4 h-4" />
                </Button>
            </div>
        </div>

        {processingError && (
          <div className="text-sm text-destructive">{processingError}</div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg w-fit">
            <TabButton 
                active={activeTab === "summary"} 
                onClick={() => setActiveTab("summary")}
                icon={SparklesIcon}
                label="摘要"
            />
            <TabButton 
                active={activeTab === "notes"} 
                onClick={() => setActiveTab("notes")}
                icon={FileEditIcon}
                label="笔记"
            />
            <TabButton 
                active={activeTab === "transcript"} 
                onClick={() => setActiveTab("transcript")}
                icon={AlignLeftIcon}
                label="转录"
            />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/50">
        {record.status === "processing" ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                    <SparklesIcon className="w-12 h-12 text-primary relative z-10 animate-bounce" />
                </div>
                <p>AI 正在智能分析录音内容...</p>
            </div>
        ) : (
            <div className="max-w-3xl mx-auto">
                {activeTab === "summary" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-card border rounded-xl p-6 shadow-sm">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4 text-primary" />
                                智能摘要
                            </h3>
                            <div className="prose prose-sm dark:prose-invert text-muted-foreground leading-relaxed whitespace-pre-line">
                                {record.summary || "暂无摘要"}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "notes" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-card border rounded-xl p-6 shadow-sm">
                             <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <FileEditIcon className="w-4 h-4 text-primary" />
                                重点笔记
                            </h3>
                             <div className="prose prose-sm dark:prose-invert text-muted-foreground leading-relaxed whitespace-pre-line">
                                {record.notes || "暂无笔记"}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "transcript" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="bg-card border rounded-xl p-6 shadow-sm">
                             <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <AlignLeftIcon className="w-4 h-4 text-primary" />
                                全文转写
                            </h3>
                            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {record.transcript || "暂无转录内容"}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
      
      {record.status === "completed" && playbackUrl && (
        <div className="border-t p-4 bg-background">
          <audio controls src={playbackUrl} className="w-full" />
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: LucideIcon; label: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                active 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            )}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    )
}
