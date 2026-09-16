import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Forwards Supabase Google codes from the shared Kaenz project to Mapucoin. */
export async function GET(req: Request) {
  const src = new URL(req.url);
  const dest = new URL("https://mapucoin.com/auth/callback");
  dest.search = src.search;
  return NextResponse.redirect(dest);
}
