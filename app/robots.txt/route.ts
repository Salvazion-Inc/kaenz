import { robotsTxt, textFile } from "@/lib/discoverability";

export const dynamic = "force-static";

export function GET() {
  return textFile(robotsTxt(), "text/plain; charset=utf-8");
}
