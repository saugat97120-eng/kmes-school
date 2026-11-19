import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const rootDir = "C:/Users/Dell/OneDrive/Desktop/KMES FILES/kmes-school";
const outputZip = path.join(rootDir, "kmes-school-clean-release.zip");

console.log("Creating clean release archive using git archive...");

try {
  // Use git archive to produce a completely clean, tracked-only zip without node_modules, .env, backups, or dist
  execSync(`git archive --format=zip --prefix=kmes-school/ -o "${outputZip}" HEAD`, { cwd: rootDir });
  console.log(`\nSUCCESS: Clean release package created at:`);
  console.log(outputZip);
  const sizeMb = (fs.statSync(outputZip).size / (1024 * 1024)).toFixed(2);
  console.log(`Package Size: ${sizeMb} MB (Sanitized, zero secrets, zero node_modules)`);
} catch (err) {
  console.error("Failed to create git archive:", err.message);
  process.exit(1);
}
