
import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const result = await db.execute(sql`
      SELECT exists (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'document_snapshots'
      );
    `);
    console.log("Table 'document_snapshots' exists:", result.rows[0].exists);

    // Also check if 'users' table exists just in case
    const usersResult = await db.execute(sql`
        SELECT exists (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
        );
    `);
    console.log("Table 'users' exists:", usersResult.rows[0].exists);

  } catch (error) {
    console.error("Error checking tables:", error);
  }
  process.exit(0);
}

main();
