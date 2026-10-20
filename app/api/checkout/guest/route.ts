export const runtime = "nodejs";

/** Guest checkout is closed. Verified accounts book with POST /api/checkout. */
export async function POST() {
  return Response.json(
    { error: "gone", message: "Guest checkout is closed." },
    { status: 410 },
  );
}

export async function GET() {
  return Response.json(
    { error: "gone", message: "Guest checkout is closed." },
    { status: 410 },
  );
}
