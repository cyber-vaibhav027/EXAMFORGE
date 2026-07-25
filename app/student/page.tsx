"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Watermark from "../components/Watermark";

type Attempt = { exam_code: string; score: number; max_score: number; created_at: string; exam_title?: string; examiner_name?: string };

export default function StudentDashboard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinError, setJoinError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("");

  const field = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#4C3F91]";

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/student/login"); return; }
      setName(data.user.user_metadata?.name || data.user.email || "Student");
      setEmail(data.user.email || "");

      const res = await fetch(`/api/student-history?studentId=${data.user.id}`);
      const d = await res.json();
      setAttempts(d.attempts || []);
      setLoading(false);
    });
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/student/login");
  }

  async function joinExam() {
    setJoinError("");
    const res = await fetch(`/api/exam/${code.trim()}`);
    if (!res.ok) { setJoinError("No exam found for that code."); return; }
    router.push(`/student/exam?code=${code.trim().toUpperCase()}`);
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center"><p className="text-neutral-500">Loading…</p></main>;

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 relative">
      <Watermark text={email} />

      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="serif text-4xl md:text-5xl mb-2">Hi, {name}</h1>
          <p className="text-neutral-500">Join a new exam or review your past results.</p>
        </div>
        <button onClick={logout}
          className="text-sm text-neutral-600 border border-neutral-300 rounded-lg px-4 py-2 hover:border-[#4C3F91] hover:text-[#4C3F91] transition">
          Log out
        </button>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400 mb-3">Join an exam</p>
        <div className="flex gap-3">
          <input className={field} placeholder="Enter exam code" value={code}
            onChange={e=>setCode(e.target.value.toUpperCase())} />
          <button onClick={joinExam} disabled={!code}
            className="rounded-lg bg-[#4C3F91] text-white px-5 py-2 text-sm font-medium disabled:opacity-40 whitespace-nowrap">
            Join
          </button>
        </div>
        {joinError && <p className="text-sm text-red-500 mt-2">{joinError}</p>}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <button
          onClick={() => setHistoryOpen(o => !o)}
          className="w-full flex justify-between items-center p-6 text-left"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Your exam history</p>
            <p className="text-sm text-neutral-600 mt-1">
              {attempts.length} exam{attempts.length !== 1 ? "s" : ""} taken — click to view
            </p>
          </div>
          <span className="text-[#4C3F91] text-sm whitespace-nowrap ml-3">
            {historyOpen ? "Hide ▲" : "View ▼"}
          </span>
        </button>

        {historyOpen && (
          <div className="border-t border-neutral-100 p-6 pt-4">
            {attempts.length === 0 ? (
              <p className="text-neutral-500 text-sm">You haven't taken any exams yet.</p>
            ) : (
              <>
                <div className="mb-4">
                  <label className="text-sm text-neutral-600">Filter by date</label>
                  <input type="date" className={field} value={dateFilter}
                    onChange={e=>setDateFilter(e.target.value)} />
                  {dateFilter && (
                    <button onClick={()=>setDateFilter("")} className="text-xs text-[#4C3F91] underline mt-1">
                      Clear filter
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {attempts
                    .filter(a => !dateFilter || new Date(a.created_at).toISOString().slice(0,10) === dateFilter)
                    .map((a, i) => {
                      const pct = Math.round((a.score / a.max_score) * 100);
                      return (
                        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{a.exam_title || `Exam ${a.exam_code}`}</p>
                              <p className="text-xs text-neutral-400 mt-1">
                                Code: {a.exam_code} · By {a.examiner_name || "Unknown"} · {new Date(a.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-medium ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-500"}`}>
                                {a.score}/{a.max_score}
                              </p>
                              <p className="text-xs text-neutral-400">{pct}%</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {dateFilter && attempts.filter(a => new Date(a.created_at).toISOString().slice(0,10) === dateFilter).length === 0 && (
                  <p className="text-neutral-500 text-sm mt-3">No exams on this date.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}