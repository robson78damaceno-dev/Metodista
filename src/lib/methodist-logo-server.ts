import "server-only";
import fs from "fs";
import path from "path";
import { METHODIST_LOGO_PUBLIC_PATH } from "@/lib/methodist-logo";

const LOGO_FILENAME = METHODIST_LOGO_PUBLIC_PATH.replace(/^\//, "");

export function getMethodistLogoDataUri() {
  const logoPath = path.join(process.cwd(), "public", LOGO_FILENAME);
  const buffer = fs.readFileSync(logoPath);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
