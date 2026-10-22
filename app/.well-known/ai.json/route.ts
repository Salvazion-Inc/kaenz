import { aiJson, textFile } from "@/lib/discoverability";

export const dynamic = "force-static";

export function GET() {
  return textFile(aiJson(), "application/json; charset=utf-8");
}
