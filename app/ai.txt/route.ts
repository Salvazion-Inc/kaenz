import { aiTxt, textFile } from "@/lib/discoverability";

export const dynamic = "force-static";

export function GET() {
  return textFile(aiTxt(), "text/plain; charset=utf-8");
}
