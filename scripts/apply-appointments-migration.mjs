#!/usr/bin/env node

/**
 * Script to apply the appointments migration to Supabase
 * This ensures the appointments table exists in the database
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

console.log("🔧 Applying appointments migration...\n");

try {
  // Check if migration file exists
  const migrationFile = join(
    projectRoot,
    "supabase/migrations/20250218000000_create_appointments.sql"
  );

  if (!existsSync(migrationFile)) {
    console.error("❌ Migration file not found:", migrationFile);
    process.exit(1);
  }

  console.log("✓ Migration file found");
  console.log("📦 Applying migrations to local Supabase...\n");

  // Apply migrations
  execSync("npx supabase migration up", {
    cwd: projectRoot,
    stdio: "inherit",
  });

  console.log("\n✅ Migrations applied successfully!");
  console.log("\n💡 If you're using a remote Supabase instance, run:");
  console.log("   npx supabase db push\n");
} catch (error) {
  console.error("\n❌ Error applying migrations:", error.message);
  console.log("\n💡 Make sure Supabase is running locally:");
  console.log("   npx supabase start\n");
  process.exit(1);
}


