
import { db } from "../db";
import { documentSnapshots, users, documents } from "../db/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  const documentId = "7a9476c9-0de7-4821-b9ab-ed4989a93b47";
  const userId = "user_2s8j5r7x9z4y1w3v5u7t8s9r0q"; // Need a valid user ID or we create one

  try {
    // 1. Check if document exists, if not create a dummy one
    const existingDoc = await db.query.documents.findFirst({
        where: eq(documents.id, documentId)
    });
    
    if (!existingDoc) {
        console.log("Document not found, skipping insert test (or create one if you want)");
        // return; 
    }

    // 2. Insert a test snapshot
    console.log("Inserting test snapshot...");
    // We need a valid user ID for createdBy. Let's find one.
    const user = await db.query.users.findFirst();
    if (!user) {
        console.log("No users found, cannot insert snapshot");
        return;
    }

    // Insert snapshot
    await db.insert(documentSnapshots).values({
        documentId: documentId,
        version: 1,
        blocksSnapshot: [],
        reason: "Test snapshot",
        createdBy: user.id,
        blockCount: 0
    }).onConflictDoNothing();

    console.log("Running Drizzle query...");
    const snapshots = await db
      .select({
        id: documentSnapshots.id,
        version: documentSnapshots.version,
        createdAt: documentSnapshots.createdAt,
        reason: documentSnapshots.reason,
        creator: {
          id: users.id,
          name: users.username,
          imageUrl: users.imageUrl,
        }
      })
      .from(documentSnapshots)
      .leftJoin(users, eq(documentSnapshots.createdBy, users.id))
      .where(eq(documentSnapshots.documentId, documentId))
      .orderBy(desc(documentSnapshots.version));
      
    console.log("Query success. Rows:", snapshots);
  } catch (error) {
    console.error("Query failed!");
    console.error(error);
  }
  process.exit(0);
}

main();
