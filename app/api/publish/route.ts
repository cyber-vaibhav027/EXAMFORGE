import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: Request) {
  const { title, questions, durationMinutes, examinerId, examinerName } = await req.json();
  const code = makeCode();
  const { error } = await supabase.from("exams").insert({
    code, title, questions, duration_minutes: durationMinutes,
    examiner_id: examinerId, examiner_name: examinerName,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ code });
}