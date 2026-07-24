import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const examinerId = searchParams.get("examinerId");
  if (!examinerId) return NextResponse.json({ exams: [] });

  const { data: exams } = await supabase
    .from("exams")
    .select("code, title, created_at, duration_minutes")
    .eq("examiner_id", examinerId)
    .order("created_at", { ascending: false });

  if (!exams || exams.length === 0) {
    return NextResponse.json({ exams: [], totalExams: 0, totalStudents: 0 });
  }

  const codes = exams.map(e => e.code);
  const { data: subs } = await supabase
    .from("submissions")
    .select("exam_code, score, max_score")
    .in("exam_code", codes);

  const examsWithStats = exams.map(e => {
    const examSubs = (subs || []).filter(s => s.exam_code === e.code);
    const avgPct = examSubs.length > 0
      ? Math.round(examSubs.reduce((sum, s) => sum + (s.score / s.max_score) * 100, 0) / examSubs.length)
      : null;
    return { ...e, studentCount: examSubs.length, avgPct };
  });

  return NextResponse.json({
    exams: examsWithStats,
    totalExams: exams.length,
    totalStudents: (subs || []).length,
  });
}