
import { db } from "../db";
import { documentSnapshots } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const documentId = "7a9476c9-0de7-4821-b9ab-ed4989a93b47";
  
  try {
    console.log("Deleting test snapshots...");
    await db.delete(documentSnapshots)
        .where(eq(documentSnapshots.documentId, documentId));
      
    console.log("Cleanup success.");
  } catch (error) {
    console.error("Cleanup failed!");
    console.error(error);
  }
  process.exit(0);
}

main();
