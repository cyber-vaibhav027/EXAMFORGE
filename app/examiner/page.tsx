"use client";
import { useState } from "react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

type Q = { id:number; type:string; difficulty:string; question:string; options:string[]; answer:string; marks:number };

export default function Examiner() {
  const [material, setMaterial] = useState("");
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [title, setTitle] = useState("Class Test 1");
  const [difficulty, setDifficulty] = useState("medium");
  const [numMCQ, setNumMCQ] = useState(5);
  const [numShort, setNumShort] = useState(2);
  const [numLong, setNumLong] = useState(1);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [code, setCode] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [marksMCQ, setMarksMCQ] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [marksShort, setMarksShort] = useState(3);
  const [marksLong, setMarksLong] = useState(5);
  const totalMarks = numMCQ * marksMCQ + numShort * marksShort + numLong * marksLong;

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPdfBase64((reader.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  }

  async function generate() {
    setLoading(true); setQuestions([]); setCode("");
    const res = await fetch("/api/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ material, pdfBase64, config: { title, difficulty, numMCQ, numShort, numLong, marksMCQ, marksShort, marksLong } }),
    });
    const data = await res.json();
    setQuestions(data.questions || []);
    setLoading(false);
  }

  async function updateQuestion(id: number, field: string, value: any) {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, [field]: value } : q));
  }

  async function deleteQuestion(id: number) {
    setQuestions(qs => qs.filter(q => q.id !== id));
  }

  async function publish() {
    setPublishing(true);
    const res = await fetch("/api/publish", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, questions, durationMinutes }),
    });
    const data = await res.json();
    setCode(data.code || "");
    setPublishing(false);
  }

  async function downloadWord() {
  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `Difficulty: ${difficulty}  |  Total Marks: ${totalMarks}`, spacing: { after: 300 } }),
  ];

  questions.forEach((q, i) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${i + 1}. ${q.question} `, bold: true }),
          new TextRun({ text: `(${q.marks} marks)`, italics: true }),
        ],
        spacing: { before: 200 },
      })
    );
    if (q.options?.length > 0) {
      q.options.forEach((o, j) => {
        children.push(new Paragraph({ text: `   ${String.fromCharCode(65 + j)}. ${o}` }));
      });
    }
  });

  children.push(new Paragraph({ text: "Answer Key", heading: HeadingLevel.HEADING_1, spacing: { before: 600 } }));
  questions.forEach((q, i) => {
    children.push(new Paragraph({ text: `${i + 1}. ${q.answer}` }));
  });

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title.replace(/\s+/g, "_")}.docx`);
}

  const field = "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#4C3F91]";

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="serif text-3xl mb-8">Create an exam</h1>

      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
        <div>
          <label className="text-sm text-neutral-600">Exam title</label>
          <input className={field} value={title} onChange={e=>setTitle(e.target.value)} />
        </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div>
        <label className="text-sm text-neutral-600">Difficulty</label>
        <select className={field} value={difficulty} onChange={e=>setDifficulty(e.target.value)}>
          <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
        </select>
      </div>
      <div></div>
      <div className="text-xs text-neutral-400 self-end pb-2">Count</div>
      <div className="text-xs text-neutral-400 self-end pb-2">Marks each</div>

      <div><label className="text-sm text-neutral-600">MCQs</label></div>
      <div></div>
      <input type="number" className={field} value={numMCQ} onChange={e=>setNumMCQ(+e.target.value)} />
      <input type="number" className={field} value={marksMCQ} onChange={e=>setMarksMCQ(+e.target.value)} />

      <div><label className="text-sm text-neutral-600">Short</label></div>
      <div></div>
      <input type="number" className={field} value={numShort} onChange={e=>setNumShort(+e.target.value)} />
      <input type="number" className={field} value={marksShort} onChange={e=>setMarksShort(+e.target.value)} />

      <div><label className="text-sm text-neutral-600">Long</label></div>
      <div></div>
      <input type="number" className={field} value={numLong} onChange={e=>setNumLong(+e.target.value)} />
      <input type="number" className={field} value={marksLong} onChange={e=>setMarksLong(+e.target.value)} />
      </div>

      <div>
      <label className="text-sm text-neutral-600">Exam duration (minutes)</label>
      <input type="number" className={field} value={durationMinutes} onChange={e=>setDurationMinutes(+e.target.value)} />
      </div>

      <p className="text-sm text-neutral-500">Total marks: <span className="text-[#4C3F91] font-medium">{totalMarks}</span></p>
        <div>
          <label className="text-sm text-neutral-600">Study material</label>
          <label className="mt-1 flex items-center gap-3 rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm cursor-pointer hover:border-[#4C3F91]">
            <span className="text-[#4C3F91]">Upload PDF</span>
            <span className="text-neutral-400">{fileName || "typed or handwritten"}</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={onFile} />
          </label>
          <p className="text-xs text-neutral-400 my-2">— or paste text —</p>
          <textarea className={`${field} h-32 resize-none`} value={material} onChange={e=>setMaterial(e.target.value)}
            placeholder="Paste a chapter here if you don't have a PDF..." />
        </div>

        <button onClick={generate} disabled={loading || (!material && !pdfBase64)}
          className="rounded-lg bg-[#4C3F91] text-white px-5 py-2.5 text-sm font-medium disabled:opacity-40">
          {loading ? "Reading & generating…" : "Generate exam"}
        </button>
      </div>

      {questions.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="serif text-2xl">{title}</h2>
            <button onClick={()=>setShowAnswers(s=>!s)} className="text-sm text-[#4C3F91]">
              {showAnswers ? "Hide answer key" : "Show answer key"}
            </button>
            <button onClick={downloadWord}
              className="text-sm text-[#4C3F91] border border-[#4C3F91] rounded-lg px-3 py-1.5">
              Download as Word
            </button>
          </div>

          <ol className="space-y-5">
            {questions.map((q,i)=>(
              <li key={q.id} className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="flex justify-between text-xs text-neutral-400 mb-2">
                <span className="uppercase tracking-wide">{q.type} · {q.difficulty}</span>
                <div className="flex items-center gap-3">
                  <span>{q.marks} marks</span>
                  <button onClick={()=>deleteQuestion(q.id)} className="text-red-400 hover:text-red-600">Remove</button>
                </div>
              </div>
              <textarea
                className="w-full font-medium bg-transparent resize-none border-0 focus:outline-none focus:bg-neutral-50 rounded px-1"
                value={q.question}
                onChange={e=>updateQuestion(q.id, "question", e.target.value)}
                rows={2}
              />
              {q.options?.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-neutral-700">
                  {q.options.map((o,j)=><li key={j}>{String.fromCharCode(65+j)}. {o}</li>)}
                </ul>
              )}
              {showAnswers && (
                <p className="mt-3 text-sm text-[#4C3F91] bg-[#EEEBF7] rounded-md px-3 py-2">Answer: {q.answer}</p>
              )}
            </li>  
            ))}
          </ol>

          <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 text-center">
            {code ? (
              <>
                <p className="text-sm text-neutral-500 mb-2">Share this code with students</p>
                <p className="serif text-4xl tracking-[0.3em] text-[#4C3F91]">{code}</p>
                <a href={`/examiner/results/${code}`} className="inline-block mt-3 text-sm text-[#4C3F91] underline">
                  View results
                </a>
              </>
            ) : (
              <button onClick={publish} disabled={publishing}
                className="rounded-lg bg-[#4C3F91] text-white px-5 py-2.5 text-sm font-medium disabled:opacity-40">
                {publishing ? "Publishing…" : "Publish & get exam code"}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
