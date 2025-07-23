// app/api/summary/get/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth"; // Add this import
import { connectMongo } from "@/lib/mongo";
import MeetingSummary from "@/models/MeetingSummary";

// Remove the hardcoded USER_ID

export async function GET(req: Request) {
  try {
    // Get session and authenticate user
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const USER_ID = session.user.id; // Use session user ID

    await connectMongo();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }
    
    console.log(`Fetching summary ${id} for user ${USER_ID}`);
    
    const doc = await MeetingSummary.findOne({ _id: id, userId: USER_ID });
    
    if (!doc) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    
    return NextResponse.json({ ok: true, summary: doc });
  } catch (e: any) {
    console.error("Summary get error:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
