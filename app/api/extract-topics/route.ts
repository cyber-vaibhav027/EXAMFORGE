import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function chunkText(text: string, chunkSize = 6000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function POST(req: Request) {
  try {
    const { pdfBase64, material } = await req.json();

    let fullText = material || "";
    if (pdfBase64) {
      const buffer = Buffer.from(pdfBase64, "base64");
      const pdfDoc = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdfDoc, { mergePages: true });
      fullText = text;
    }

    if (!fullText.trim()) {
      return NextResponse.json({ error: "No readable text found." }, { status: 400 });
    }

    const chunks = chunkText(fullText, 6000);

    // Stage A: extract topics from each chunk (in parallel, capped batches to avoid rate limits)
    const chunkTopicPromises = chunks.map(async (chunk, i) => {
      const res = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{
          role: "user",
          content: `List the distinct topics/subtopics covered in this text excerpt. Return ONLY JSON:
{ "topics": [ "topic name", "topic name" ] }
Keep topic names short (2-6 words). Do not invent topics not present in the text.

TEXT:
"""
${chunk}
"""`,
        }],
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(res.choices[0].message.content ?? "{}");
      return { chunkIndex: i, text: chunk, topics: parsed.topics ?? [] };
    });

    const chunkResults = await Promise.all(chunkTopicPromises);

    // Stage B: merge/dedupe all topic names into one clean master list
    const allTopicNames = chunkResults.flatMap(c => c.topics);
    const mergeRes = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "user",
        content: `Here is a raw list of topic names extracted from different sections of a document.
Merge duplicates and near-duplicates into a clean final list of 6-15 distinct topics.
Return ONLY JSON: { "topics": [ "clean topic name" ] }

RAW LIST:
${JSON.stringify(allTopicNames)}`,
      }],
      response_format: { type: "json_object" },
    });
    const finalTopics: string[] = JSON.parse(mergeRes.choices[0].message.content ?? "{}").topics ?? [];

    // Map each final topic back to the chunk text where it likely appears (keyword match)
    const topicsWithMaterial = finalTopics.map(topic => {
      const relevantChunks = chunkResults.filter(c =>
        c.topics.some((t: string) => t.toLowerCase().includes(topic.toLowerCase().split(" ")[0]) || topic.toLowerCase().includes(t.toLowerCase().split(" ")[0]))
      );
      const material = relevantChunks.length > 0
        ? relevantChunks.map(c => c.text).join("\n\n")
        : fullText.slice(0, 6000); // fallback
      return { topic, material };
    });

    return NextResponse.json({ topics: topicsWithMaterial.map(t => t.topic), topicMaterials: topicsWithMaterial });
  } catch (err: any) {
    console.error("EXTRACT TOPICS ERROR:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}