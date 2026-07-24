"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Result = { id: number; awarded: number; max: number; feedback: string };
type Sub = { student_name: string; score: number; max_score: number; results: Result[]; created_at: string };

export default function Results() {
  const { code } = useParams<{ code: string }>();
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/results/${code}`).then(r=>r.json()).then(d => { setSubs(d.submissions || []); setLoading(false); });
  }, [code]);

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="serif text-3xl mb-2">Results</h1>
      <p className="text-sm text-neutral-500 mb-8">Exam code: {code} · {subs.length} submission{subs.length !== 1 ? "s" : ""}</p>

      {loading ? <p className="text-neutral-500">Loading…</p> : subs.length === 0 ? (
        <p className="text-neutral-500">No submissions yet.</p>
      ) : (
        <div className="space-y-3">
          {subs.map((s, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex justify-between items-center p-4 text-left"
              >
                <div>
                  <p className="font-medium">{s.student_name}</p>
                  <p className="text-xs text-neutral-400">{new Date(s.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#4C3F91] font-medium">{s.score}/{s.max_score}</span>
                  <span className="text-xs text-neutral-400">{Math.round((s.score/s.max_score)*100)}%</span>
                  <span className="text-neutral-400">{openIndex === i ? "−" : "+"}</span>
                </div>
              </button>

              {openIndex === i && (
                <div className="border-t border-neutral-100 p-4 space-y-3 bg-neutral-50">
                  {s.results.map((r, j) => (
                    <div key={j} className="text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Question {j + 1}</span>
                        <span className="text-[#4C3F91]">{r.awarded}/{r.max}</span>
                      </div>
                      <p className="text-neutral-600 mt-0.5">{r.feedback}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}