import { NextResponse } from "next/server";

const BACKEND_BASE_URL = "http://localhost:8000/lectures";

export async function GET(
  _request: Request,
  context: { params: Promise<{ lectureId: string; slide: string }> }
) {
  try {
    const { lectureId, slide } = await context.params;
    const res = await fetch(`${BACKEND_BASE_URL}/step/${lectureId}/${slide}`, {
      method: "GET",
      // Let cookies and headers be default; CORS isn't an issue server-to-server
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ message: "proxy error" }, { status: 500 });
  }
}


