"use client";
import { useState, useEffect } from "react";

type Q = { id:number; type:string; difficulty:string; question:string; options:string[]; marks:number };
type Res = { id:number; awarded:number; max:number; feedback:string };

export default function Student() {
  const [stage, setStage] = useState<"join"|"exam"|"done">("join");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<number,string>>({});
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [results, setResults] = useState<Res[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const field = "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#4C3F91]";
  const set = (id:number, v:string) => setAnswers(a => ({ ...a, [id]: v }));

  useEffect(() => {
  if (stage !== "exam" || timeLeft === null) return;
  if (timeLeft <= 0) { submit(); return; }
  const t = setTimeout(() => setTimeLeft(s => (s ?? 1) - 1), 1000);
  return () => clearTimeout(t);
}, [stage, timeLeft]);
  
  async function join() {
    setError("");
    const res = await fetch(`/api/exam/${code.trim()}`);
    if (!res.ok) { setError("No exam found for that code."); return; }
    const data = await res.json();
    setTitle(data.title); setQuestions(data.questions); setStage("exam"); 
    setTimeLeft(data.durationMinutes * 60);
  }

  async function submit() {
    setLoading(true);
    const res = await fetch("/api/submit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), studentName: name, answers }),
    });
    const data = await res.json();
    setScore(data.score); setMaxScore(data.maxScore); setResults(data.results);
    setLoading(false); setStage("done");
  }

  if (stage === "join") return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8">
        <h1 className="serif text-2xl mb-6">Join an exam</h1>
        <label className="text-sm text-neutral-600">Your name</label>
        <input className={`${field} mb-4`} value={name} onChange={e=>setName(e.target.value)} />
        <label className="text-sm text-neutral-600">Exam code</label>
        <input className={`${field} mb-4 uppercase tracking-widest`} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} />
        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        <button onClick={join} disabled={!name || !code}
          className="w-full rounded-lg bg-[#4C3F91] text-white px-5 py-2.5 text-sm font-medium disabled:opacity-40">Start</button>
      </div>
    </main>
  );

  if (stage === "exam") return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="serif text-3xl mb-8">{title}</h1>
      <p className="text-sm text-neutral-500 mb-6">
  Time left: {timeLeft !== null ? `${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,"0")}` : ""}
</p>
      <ol className="space-y-5">
        {questions.map((q,i)=>(
          <li key={q.id} className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex justify-between text-xs text-neutral-400 mb-2">
              <span className="uppercase tracking-wide">{q.type} · {q.difficulty}</span>
              <span>{q.marks} marks</span>
            </div>
            <p className="font-medium mb-3">{i+1}. {q.question}</p>
            {q.type === "mcq" ? (
              <div className="space-y-2">
                {q.options.map((o,j)=>(
                  <label key={j} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name={`q${q.id}`} value={o} checked={answers[q.id]===o} onChange={()=>set(q.id,o)} />
                    {String.fromCharCode(65+j)}. {o}
                  </label>
                ))}
              </div>
            ) : (
              <textarea className={`${field} h-24 resize-none`} value={answers[q.id]||""} onChange={e=>set(q.id,e.target.value)} placeholder="Your answer..." />
            )}
          </li>
        ))}
      </ol>
      <button onClick={submit} disabled={loading}
        className="mt-8 rounded-lg bg-[#4C3F91] text-white px-6 py-2.5 text-sm font-medium disabled:opacity-40">
        {loading ? "Grading…" : "Submit exam"}
      </button>
    </main>
  );

  const pct = maxScore ? Math.round((score/maxScore)*100) : 0;
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center mb-8">
        <p className="text-sm text-neutral-500 mb-1">{name} · {title}</p>
        <p className="serif text-5xl text-[#4C3F91]">{score} / {maxScore}</p>
        <p className="text-neutral-500 mt-1">{pct}%</p>
      </div>
      <ol className="space-y-4">
        {questions.map((q,i)=>{
          const r = results.find(x=>x.id===q.id);
          return (
            <li key={q.id} className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="flex justify-between mb-1">
                <p className="font-medium">{i+1}. {q.question}</p>
                <span className="text-sm text-[#4C3F91] whitespace-nowrap ml-3">{r?.awarded}/{r?.max}</span>
              </div>
              <p className="text-sm text-neutral-500">{r?.feedback}</p>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
