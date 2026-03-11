
import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'document_snapshots';
    `);
    console.log("Columns in document_snapshots:", result.rows);
  } catch (error) {
    console.error("Error checking columns:", error);
  }
  process.exit(0);
}

main();
