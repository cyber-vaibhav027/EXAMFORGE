import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const examinerId = searchParams.get("examinerId");

  let query = supabase
    .from("exams")
    .select("code, title, created_at, duration_minutes")
    .order("created_at", { ascending: false });

  if (examinerId) {
    query = query.eq("examiner_id", examinerId);
  }

  const { data } = await query;
  return NextResponse.json({ exams: data || [] });
}