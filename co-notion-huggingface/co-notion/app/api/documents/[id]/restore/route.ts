import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { documentSnapshots, documents, users, blocks } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/documents/[id]/restore - 恢复到指定版本
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: documentId } = await params;
    const body = await request.json();
    const { version } = body;

    if (!version) {
      return NextResponse.json({ error: "Version is required" }, { status: 400 });
    }

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

    // 检查权限
    if (document.ownerId !== user.id) {
       // Check collaborators if needed
       // return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 获取目标版本的快照
    const [targetSnapshot] = await db
      .select()
      .from(documentSnapshots)
      .where(
        and(
          eq(documentSnapshots.documentId, documentId),
          eq(documentSnapshots.version, version)
        )
      );

    if (!targetSnapshot) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    const blocksToRestore = targetSnapshot.blocksSnapshot as any[];

    // 开启事务处理
    await db.transaction(async (tx) => {
      // 1. 保存当前状态作为新版本（可选，但在生产环境中推荐，防止误操作丢失当前进度）
      const currentBlocks = await tx
        .select()
        .from(blocks)
        .where(eq(blocks.documentId, documentId))
        .orderBy(blocks.position);
      
      const [lastSnapshot] = await tx
        .select()
        .from(documentSnapshots)
        .where(eq(documentSnapshots.documentId, documentId))
        .orderBy(desc(documentSnapshots.version))
        .limit(1);
      
      const nextVersion = (lastSnapshot?.version || 0) + 1;

      await tx.insert(documentSnapshots).values({
        documentId,
        version: nextVersion,
        blocksSnapshot: currentBlocks,
        reason: `Auto-save before restore to v${version}`,
        createdBy: user.id,
        blockCount: currentBlocks.length,
      });

      // 2. 删除当前所有 Blocks
      await tx.delete(blocks).where(eq(blocks.documentId, documentId));

      // 3. 插入恢复的 Blocks
      if (blocksToRestore && blocksToRestore.length > 0) {
        // 需要确保 block 属于当前文档
        const safeBlocks = blocksToRestore.map(b => ({
          ...b,
          documentId, // 确保 documentId 正确
          updatedAt: new Date(), // 更新时间
        }));
        await tx.insert(blocks).values(safeBlocks);
      }
    });

    return NextResponse.json({ success: true, restoredVersion: version });

  } catch (error) {
    console.error("Failed to restore version:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
