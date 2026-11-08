// Copies everything under reports/ into public/files/ so images, HTML,
// PDFs, CSVs etc. that Claude pushes alongside a report are served statically.
import { cpSync, rmSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const src = path.join(root, "reports");
const dest = path.join(root, "public", "files");

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
if (existsSync(src)) {
  cpSync(src, dest, { recursive: true });
  console.log("[sync-assets] copied reports/ -> public/files/");
}
