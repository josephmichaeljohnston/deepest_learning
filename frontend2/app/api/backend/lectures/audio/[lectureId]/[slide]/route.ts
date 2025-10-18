import { NextResponse } from "next/server";

const BACKEND_BASE_URL = "http://localhost:8000/lectures";

export async function GET(
  _request: Request,
  context: { params: Promise<{ lectureId: string; slide: string }> }
) {
  try {
    const { lectureId, slide } = await context.params;
    const res = await fetch(`${BACKEND_BASE_URL}/audio/${lectureId}/${slide}`, {
      method: "GET",
    });

    if (!res.ok || !res.body) {
      return new NextResponse(null, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "audio/wav";
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    // mirror common caching headers lightly to avoid stale audio when regenerating
    headers.set("Cache-Control", "no-store");

    return new NextResponse(res.body, { status: 200, headers });
  } catch (err) {
    return new NextResponse(null, { status: 500 });
  }
}


