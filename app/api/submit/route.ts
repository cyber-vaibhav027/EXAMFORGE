import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { code, studentName, studentId, answers } = await req.json();

    const { data: exam } = await supabase.from("exams").select("*").eq("code", code.toUpperCase()).single();
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

    const questions = exam.questions as any[];
    const results: any[] = [];
    const descriptive: any[] = [];

    for (const q of questions) {
      const given = (answers[q.id] ?? "").trim();
      if (q.type === "mcq") {
        const correct = given.toLowerCase() === String(q.answer).trim().toLowerCase();
        results.push({ id: q.id, awarded: correct ? q.marks : 0, max: q.marks,
          feedback: correct ? "Correct" : `Correct answer: ${q.answer}` });
      } else {
        descriptive.push(q);
      }
    }

    if (descriptive.length > 0) {
      const prompt = `You are grading a student's exam answers. For each item award marks from 0
to the maximum and give one short feedback sentence. Be fair but strict.
Return ONLY JSON: { "grades": [ { "id": number, "awarded": number, "feedback": string } ] }

ITEMS:
${JSON.stringify(descriptive.map((q) => ({
  id: q.id, question: q.question, model_answer: q.answer,
  max_marks: q.marks, student_answer: answers[q.id] ?? "",
})), null, 2)}`;

      const g = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      const graded = JSON.parse(g.choices[0].message.content ?? '{"grades":[]}').grades ?? [];
      for (const q of descriptive) {
        const gr = graded.find((x: any) => x.id === q.id) ?? { awarded: 0, feedback: "Not graded" };
        results.push({ id: q.id, awarded: Math.min(gr.awarded, q.marks), max: q.marks, feedback: gr.feedback });
      }
    }

    results.sort((a, b) => a.id - b.id);
    const score = results.reduce((s, r) => s + r.awarded, 0);
    const maxScore = questions.reduce((s, q) => s + q.marks, 0);

    await supabase.from("submissions").insert({
      exam_code: code.toUpperCase(),
      student_name: studentName,
      student_id: studentId,
      score,
      max_score: maxScore,
      results,
    });

    return NextResponse.json({ score, maxScore, results });
  } catch (err: any) {
    console.error("SUBMIT ERROR:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}