import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function allocate(total: number, weights: { topic: string; weight: number }[]) {
  // Largest remainder method — precise proportional allocation
  const raw = weights.map(w => ({ topic: w.topic, exact: (w.weight / 100) * total }));
  const floors = raw.map(r => ({ topic: r.topic, count: Math.floor(r.exact), rem: r.exact - Math.floor(r.exact) }));
  let assigned = floors.reduce((s, f) => s + f.count, 0);
  let remaining = total - assigned;
  floors.sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < remaining; i++) floors[i % floors.length].count += 1;
  return Object.fromEntries(floors.map(f => [f.topic, f.count]));
}

export async function POST(req: Request) {
  try {
    const { topicMaterials, weightages, difficulty, totalMCQ, totalShort, totalLong, marksMCQ, marksShort, marksLong } = await req.json();
    // topicMaterials: [{ topic, material }], weightages: [{ topic, weight }]

    const mcqAlloc = allocate(totalMCQ, weightages);
    const shortAlloc = allocate(totalShort, weightages);
    const longAlloc = allocate(totalLong, weightages);

    let idCounter = 1;
    const allQuestions: any[] = [];

    for (const { topic, material } of topicMaterials) {
      const nMCQ = mcqAlloc[topic] ?? 0;
      const nShort = shortAlloc[topic] ?? 0;
      const nLong = longAlloc[topic] ?? 0;
      if (nMCQ + nShort + nLong === 0) continue;

      const prompt = `You are an exam-setting assistant. Using ONLY this material about "${topic}", create:
- ${nMCQ} multiple-choice questions (4 options, one correct)
- ${nShort} short-answer questions
- ${nLong} long/descriptive questions
Difficulty: ${difficulty}. Include correct answer/model solution for each.

Return ONLY JSON: { "questions": [ { "type": "mcq"|"short"|"long", "difficulty": string,
  "question": string, "options": string[], "answer": string } ] }

MATERIAL:
"""
${material.slice(0, 6000)}
"""`;

      const res = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(res.choices[0].message.content ?? "{}");
      const qs = (parsed.questions ?? []).map((q: any) => ({
        ...q,
        id: idCounter++,
        topic,
        marks: q.type === "mcq" ? marksMCQ : q.type === "short" ? marksShort : marksLong,
      }));
      allQuestions.push(...qs);
    }

    return NextResponse.json({ questions: allQuestions });
  } catch (err: any) {
    console.error("GENERATE BY TOPICS ERROR:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}