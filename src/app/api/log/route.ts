import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    console.log("Form submission received:", data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error handling form submission:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
