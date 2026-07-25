"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import Watermark from "../../components/Watermark";

type Q = { id:number; type:string; difficulty:string; question:string; options:string[]; answer:string; marks:number };

export default function CreateExam() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
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
  const [paperOpen, setPaperOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [topicMaterials, setTopicMaterials] = useState<{topic:string; material:string}[]>([]);
  const [weightages, setWeightages] = useState<Record<string, number>>({});
  const [detectingTopics, setDetectingTopics] = useState(false);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const totalMarks = numMCQ * marksMCQ + numShort * marksShort + numLong * marksLong;
  const weightTotal = Object.values(weightages).reduce((a,b)=>a+b, 0);
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/examiner/login"); return; }
      setUserId(data.user.id);
        setEmail(data.user.email || "");
    });
  }, []);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPdfBase64((reader.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  }

  async function detectTopics() {
    if (!material && !pdfBase64) { alert("Upload a PDF or paste material first."); return; }
    setDetectingTopics(true);
    try {
      const res = await fetch("/api/extract-topics", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material, pdfBase64 }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setTopics(data.topics);
      setTopicMaterials(data.topicMaterials);
      const equalWeight = Math.floor(100 / data.topics.length);
      const w: Record<string, number> = {};
      data.topics.forEach((t: string, i: number) => { w[t] = i === 0 ? 100 - equalWeight*(data.topics.length-1) : equalWeight; });
      setWeightages(w);
    } finally {
      setDetectingTopics(false);
    }
  }

  async function generateFromTopics() {
    if (weightTotal !== 100) { alert("Weightages must add up to 100%."); return; }
    setLoading(true); setQuestions([]); setCode("");
    try {
      const res = await fetch("/api/generate-by-topics", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicMaterials, weightages: Object.entries(weightages).map(([topic,weight])=>({topic,weight})),
          difficulty, totalMCQ: numMCQ, totalShort: numShort, totalLong: numLong,
          marksMCQ, marksShort, marksLong,
        }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setQuestions(data.questions || []);
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    if (!title.trim()) { alert("Please enter an exam title."); return; }
    if (!difficulty) { alert("Please select a difficulty."); return; }
    if (numMCQ <= 0 && numShort <= 0 && numLong <= 0) { alert("Add at least one question."); return; }
    if ((numMCQ > 0 && marksMCQ <= 0) || (numShort > 0 && marksShort <= 0) || (numLong > 0 && marksLong <= 0)) {
      alert("Marks per question must be greater than 0.");
      return;
    }
    if (durationMinutes <= 0) { alert("Please set a valid exam duration."); return; }
    if (!material && !pdfBase64) { alert("Please upload a PDF or paste study material."); return; }

    setLoading(true); setQuestions([]); setCode("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material, pdfBase64,
          config: { title, difficulty, numMCQ, numShort, numLong, marksMCQ, marksShort, marksLong },
        }),
      });
      const data = await res.json();
      if (data.error) { alert("Error: " + data.error); return; }
      setQuestions(data.questions || []);
    } catch (e: any) {
      alert("Request failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function updateQuestion(id: number, field: string, value: any) {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, [field]: value } : q));
  }

  function deleteQuestion(id: number) {
    setQuestions(qs => qs.filter(q => q.id !== id));
  }

 async function publish() {
  setPublishing(true);
  const { data: userData } = await supabase.auth.getUser();
  const res = await fetch("/api/publish", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title, questions, durationMinutes, examinerId: userId,
      examinerName: userData.user?.user_metadata?.name || "Unknown",
    }),
  });
  const data = await res.json();
  setCode(data.code || "");
  setPublishing(false);
}

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const field = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#4C3F91]";

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
        <Watermark text={email} />
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="serif text-4xl md:text-5xl mb-2">Create an exam</h1>
          <p className="text-neutral-500">Upload material, set the mix of questions, and generate a ready exam in seconds.</p>
        </div>
        <a href="/examiner" className="text-sm text-[#4C3F91] underline whitespace-nowrap">
          ← Back to dashboard
        </a>
      </div>

      <div className="space-y-6">
        {/* Exam details */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Exam details</p>
          <div>
            <label className="text-sm text-neutral-600">Exam title</label>
            <input className={field} value={title} onChange={e=>setTitle(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-neutral-600">Difficulty</label>
              <select className={field} value={difficulty} onChange={e=>setDifficulty(e.target.value)} required>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-neutral-600">Duration (minutes)</label>
              <input type="number" className={field} value={durationMinutes} onChange={e=>setDurationMinutes(+e.target.value)} required />
            </div>
          </div>
        </div>

        {/* Question mix */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Question mix</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div></div>
            <div></div>
            <div className="text-xs text-neutral-400 self-end pb-2">Count</div>
            <div className="text-xs text-neutral-400 self-end pb-2">Marks each</div>

            <div className="col-span-2"><label className="text-sm text-neutral-600">MCQs</label></div>
            <input type="number" className={field} value={numMCQ} onChange={e=>setNumMCQ(+e.target.value)} required />
            <input type="number" className={field} value={marksMCQ} onChange={e=>setMarksMCQ(+e.target.value)} required />

            <div className="col-span-2"><label className="text-sm text-neutral-600">Short</label></div>
            <input type="number" className={field} value={numShort} onChange={e=>setNumShort(+e.target.value)} required />
            <input type="number" className={field} value={marksShort} onChange={e=>setMarksShort(+e.target.value)} required />

            <div className="col-span-2"><label className="text-sm text-neutral-600">Long</label></div>
            <input type="number" className={field} value={numLong} onChange={e=>setNumLong(+e.target.value)} required />
            <input type="number" className={field} value={marksLong} onChange={e=>setMarksLong(+e.target.value)} required />
          </div>
          <p className="text-sm text-neutral-500 pt-1">Total marks: <span className="text-[#4C3F91] font-semibold">{totalMarks}</span></p>
        </div>

        {/* Study material */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Study material</p>
          <label className="flex items-center gap-3 rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm cursor-pointer hover:border-[#4C3F91] transition">
            <span className="text-[#4C3F91]">Upload PDF</span>
            <span className="text-neutral-400">{fileName || "typed or handwritten"}</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={onFile} />
          </label>
          <p className="text-xs text-neutral-400 text-center">— or paste text —</p>
          <textarea className={`${field} h-32 resize-none`} value={material} onChange={e=>setMaterial(e.target.value)}
            placeholder="Paste a chapter here if you don't have a PDF..." />
        </div>

        {/* Topics — collapsible */}
        <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
          <button
            onClick={async () => {
              if (topics.length === 0) await detectTopics();
              setTopicsOpen(o => !o);
            }}
            disabled={detectingTopics}
            className="w-full flex justify-between items-center p-6 text-left"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Topics (optional)</p>
              <p className="text-sm text-neutral-600 mt-1">
                {detectingTopics ? "Detecting topics from your material…" :
                 topics.length > 0 ? `${topics.length} topics detected — click to adjust weightage` :
                 "Detect topics and set their weightage in the exam"}
              </p>
            </div>
            <span className="text-[#4C3F91] text-sm whitespace-nowrap ml-3">
              {detectingTopics ? "…" : topicsOpen ? "Hide ▲" : topics.length > 0 ? "Adjust ▼" : "Detect ▼"}
            </span>
          </button>

          {topicsOpen && topics.length > 0 && (
            <div className="border-t border-neutral-100 p-6 pt-4 space-y-2">
              {topics.map(t => (
                <div key={t} className="flex items-center gap-3">
                  <span className="text-sm text-neutral-700 flex-1">{t}</span>
                  <input type="number" min={0} max={100}
                    className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-sm text-right"
                    value={weightages[t] ?? 0}
                    onChange={e => {
                      const newVal = Math.max(0, Math.min(100, +e.target.value));
                      const otherTotal = Object.entries(weightages).reduce((s,[k,v]) => k===t ? s : s+v, 0);
                      const capped = Math.min(newVal, 100 - otherTotal);
                      setWeightages(w => ({ ...w, [t]: capped }));
                    }}
                  />
                  <span className="text-xs text-neutral-400">%</span>
                </div>
              ))}
              <p className={`text-sm pt-1 ${weightTotal === 100 ? "text-green-600" : "text-amber-600"}`}>
                Total: {weightTotal}% {weightTotal !== 100 && "(remaining will be auto-distributed)"}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={topics.length > 0 && topicsOpen ? generateFromTopics : generate}
          disabled={loading || (!material && !pdfBase64) || (topics.length > 0 && topicsOpen && weightTotal !== 100)}
          className="w-full rounded-lg bg-[#4C3F91] text-white px-5 py-3 text-sm font-medium disabled:opacity-40 hover:bg-[#3d3277] transition"
        >
          {loading
            ? "Generating…"
            : topics.length > 0 && topicsOpen
              ? "Generate exam from topics"
              : "Generate exam"}
        </button>
      </div>

      {questions.length > 0 && (
        <div className="mt-10">
          <button
            onClick={() => setPaperOpen(o => !o)}
            className="w-full flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-5 hover:border-[#4C3F91] transition"
          >
            <div className="text-left">
              <p className="serif text-xl">{title}</p>
              <p className="text-sm text-neutral-500 mt-1">{questions.length} questions · {totalMarks} marks</p>
            </div>
            <span className="text-[#4C3F91] text-sm">{paperOpen ? "Hide paper ▲" : "View paper ▼"}</span>
          </button>

          {paperOpen && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="serif text-2xl">{title}</h2>
                <div className="flex items-center gap-3">
                  <button onClick={()=>setShowAnswers(s=>!s)} className="text-sm text-[#4C3F91]">
                    {showAnswers ? "Hide answer key" : "Show answer key"}
                  </button>
                  <button onClick={downloadWord}
                    className="text-sm text-[#4C3F91] border border-[#4C3F91] rounded-lg px-3 py-1.5">
                    Download as Word
                  </button>
                </div>
              </div>

              <ol className="space-y-5">
                {questions.map((q,i)=>(
                  <li key={q.id} className="rounded-xl border border-neutral-200 bg-white p-5">
                    <div className="flex justify-between items-center text-xs text-neutral-400 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${q.difficulty === "easy" ? "bg-green-500" : q.difficulty === "hard" ? "bg-red-500" : "bg-amber-500"}`}></span>
                        <span className="uppercase tracking-wide">{q.type} · {q.difficulty}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>{q.marks} marks</span>
                        <button onClick={()=>deleteQuestion(q.id)} className="text-red-400 hover:text-red-600">Remove</button>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#EEEBF7] text-[#4C3F91] text-xs font-medium flex items-center justify-center">{i+1}</span>
                      <textarea
                        className="w-full font-medium text-neutral-900 bg-transparent resize-none border-0 focus:outline-none focus:bg-neutral-50 rounded px-1"
                        value={q.question}
                        onChange={e=>updateQuestion(q.id, "question", e.target.value)}
                        rows={2}
                      />
                    </div>
                    {q.options?.length > 0 && (
                      <ul className="mt-3 ml-9 space-y-1 text-sm text-neutral-700">
                        {q.options.map((o,j)=><li key={j}>{String.fromCharCode(65+j)}. {o}</li>)}
                      </ul>
                    )}
                    {showAnswers && (
                      <p className="mt-3 ml-9 text-sm text-[#4C3F91] bg-[#EEEBF7] rounded-md px-3 py-2">Answer: {q.answer}</p>
                    )}
                  </li>
                ))}
              </ol>

              <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 text-center">
                {code ? (
                  <>
                    <p className="text-sm text-neutral-500 mb-2">Share this code with students</p>
                    <p className="serif text-4xl tracking-[0.3em] text-[#4C3F91]">{code}</p>
                    <button onClick={copyCode} className="text-sm text-[#4C3F91] mt-2 underline">
                      {copied ? "Copied!" : "Copy code"}
                    </button>
                    <br />
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
        </div>
      )}
    </main>
  );
}