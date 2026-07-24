import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ attempts: [] });

  const { data: subs } = await supabase
    .from("submissions")
    .select("exam_code, score, max_score, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (!subs || subs.length === 0) return NextResponse.json({ attempts: [] });

  const codes = [...new Set(subs.map(s => s.exam_code))];
  const { data: exams } = await supabase
    .from("exams")
    .select("code, title, examiner_name")
    .in("code", codes);

  const attempts = subs.map(s => {
    const exam = exams?.find(e => e.code === s.exam_code);
    return { ...s, exam_title: exam?.title, examiner_name: exam?.examiner_name };
  });

  return NextResponse.json({ attempts });
}