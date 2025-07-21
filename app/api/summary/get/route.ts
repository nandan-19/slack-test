
// app/api/summary/get/route.ts
import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import MeetingSummary from "@/models/MeetingSummary";

const USER_ID = "demo-user-1";

export async function GET(req: Request) {
  try {
    await connectMongo();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    const doc = await MeetingSummary.findOne({ _id: id, userId: USER_ID });
    if (!doc) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, summary: doc });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
