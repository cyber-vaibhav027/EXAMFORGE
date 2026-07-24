import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data } = await supabase.from("exams").select("*").eq("code", code.toUpperCase()).single();
  if (!data) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  const safeQuestions = (data.questions as any[]).map((q) => ({
    id: q.id, type: q.type, difficulty: q.difficulty,
    question: q.question, options: q.options, marks: q.marks,
  }));
  return NextResponse.json({
    title: data.title, questions: safeQuestions,
    durationMinutes: data.duration_minutes, examinerName: data.examiner_name,
  });
}