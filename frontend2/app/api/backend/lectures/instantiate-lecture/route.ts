import { NextResponse } from "next/server";

const BACKEND_BASE_URL = "http://localhost:8000/lectures";

export async function POST(request: Request) {
  try {
    const incomingForm = await request.formData();
    const file = incomingForm.get("file_obj");
    if (!file) {
      return NextResponse.json({ message: "file_obj is required" }, { status: 400 });
    }

    // Forward the same FormData to the backend
    const res = await fetch(`${BACKEND_BASE_URL}/instantiate-lecture`, {
      method: "POST",
      body: incomingForm,
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ message: "proxy error" }, { status: 500 });
  }
}


