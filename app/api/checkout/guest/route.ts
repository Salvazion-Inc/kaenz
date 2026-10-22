export const runtime = "nodejs";

/** Guest checkout is closed. Verified accounts book with POST /api/checkout. */
function gone() {
  return Response.json(
    { error: "gone", message: "Guest checkout is closed." },
    { status: 410 },
  );
}

export const GET = gone;
export const POST = gone;
export const PUT = gone;
export const PATCH = gone;
export const DELETE = gone;
export const OPTIONS = gone;
export const HEAD = gone;
