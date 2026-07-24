import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { material, pdfBase64, config } = await req.json();

    // If a PDF was uploaded, extract its text here (free, no AI needed)
    let sourceText = material || "";
    
    if (pdfBase64) {
      const buffer = Buffer.from(pdfBase64, "base64");
      const pdfDoc = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdfDoc, { mergePages: true });
      sourceText = text;
    }

    if (!sourceText.trim()) {
      return NextResponse.json({ error: "No readable text found in the material." }, { status: 400 });
    }

    const instructions = `You are an exam-setting assistant for a teacher.
Using ONLY the study material provided, create an exam. Do not invent facts
that aren't supported by the material.

REQUIREMENTS:
- Title: ${config.title}
- Difficulty: ${config.difficulty}
- ${config.numMCQ} multiple-choice questions (4 options, exactly one correct)
- ${config.numShort} short-answer questions
- ${config.numLong} long / descriptive questions
- Include the correct answer or model solution for every question.

Return ONLY valid JSON in this shape — no markdown, no commentary:
{ "title": string,
  "questions": [ { "id": number, "type": "mcq"|"short"|"long",
    "difficulty": "easy"|"medium"|"hard", "question": string,
    "options": string[], "answer": string, "marks": number } ] }

STUDY MATERIAL:
"""
${sourceText.slice(0, 12000)}
"""`;

    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: instructions }],
      response_format: { type: "json_object" },
    });
    
    const parsed = JSON.parse(res.choices[0].message.content ?? "{}");
    if (!parsed.questions || parsed.questions.length === 0) {
  return NextResponse.json({ error: "AI returned no questions — try again or shorten the material." }, { status: 502 });
    }
    const marksByType: Record<string, number> = {
      mcq: config.marksMCQ ?? 1,
      short: config.marksShort ?? 3,
      long: config.marksLong ?? 5,
    };

    parsed.questions = (parsed.questions ?? []).map((q: any) => ({
      ...q,
      marks: marksByType[q.type] ?? q.marks,
    }));

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("GENERATE ERROR:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}