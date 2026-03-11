import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { documentSnapshots, documents, users, blocks } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/documents/[id]/versions - 获取版本历史
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: documentId } = await params;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // 检查权限 (简单起见，只要是 owner 或者有权限的用户)
    // 这里假设 ownerId 匹配即可，或者后续可以加协作表检查
    if (document.ownerId !== user.id) {
       // TODO: Check collaborators
       // return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const versions = await db
      .select({
        id: documentSnapshots.id,
        version: documentSnapshots.version,
        createdAt: documentSnapshots.createdAt,
        reason: documentSnapshots.reason,
        creator: {
          id: users.id,
          name: users.name,
          email: users.email,
          imageUrl: users.imageUrl,
        }
      })
      .from(documentSnapshots)
      .leftJoin(users, eq(documentSnapshots.createdBy, users.id))
      .where(eq(documentSnapshots.documentId, documentId))
      .orderBy(desc(documentSnapshots.version));

    return NextResponse.json({ versions });

  } catch (error) {
    console.error("Failed to fetch versions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/documents/[id]/versions - 创建新版本（快照）
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: documentId } = await params;
    const body = await request.json();
    const { reason = "manual" } = body;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // 获取当前所有 Blocks
    const currentBlocks = await db
      .select()
      .from(blocks)
      .where(eq(blocks.documentId, documentId))
      .orderBy(blocks.position);

    // 获取最新版本号
    const [lastSnapshot] = await db
      .select()
      .from(documentSnapshots)
      .where(eq(documentSnapshots.documentId, documentId))
      .orderBy(desc(documentSnapshots.version))
      .limit(1);

    const nextVersion = (lastSnapshot?.version || 0) + 1;

    // 创建快照
    const [newSnapshot] = await db
      .insert(documentSnapshots)
      .values({
        documentId,
        version: nextVersion,
        blocksSnapshot: currentBlocks,
        reason,
        createdBy: user.id,
        blockCount: currentBlocks.length,
        // sizeBytes: JSON.stringify(currentBlocks).length // Optional
      })
      .returning();

    return NextResponse.json({ snapshot: newSnapshot }, { status: 201 });

  } catch (error) {
    console.error("Failed to create version:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
