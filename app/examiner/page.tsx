"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ExamStat = { code: string; title: string; created_at: string; duration_minutes: number; studentCount: number; avgPct: number | null };

export default function ExaminerDashboard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [exams, setExams] = useState<ExamStat[]>([]);
  const [totalExams, setTotalExams] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/examiner/login"); return; }
      setName(data.user.user_metadata?.name || data.user.email || "Examiner");

      const res = await fetch(`/api/examiner-stats?examinerId=${data.user.id}`);
      const stats = await res.json();
      setExams(stats.exams || []);
      setTotalExams(stats.totalExams || 0);
      setTotalStudents(stats.totalStudents || 0);
      setLoading(false);
    });
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/examiner/login");
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center"><p className="text-neutral-500">Loading…</p></main>;

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="serif text-4xl md:text-5xl mb-2">Hi, {name}</h1>
          <p className="text-neutral-500">Manage your exams and track student performance.</p>
        </div>
        <button onClick={logout} className="text-sm text-neutral-400 hover:text-neutral-600">Log out</button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center">
          <p className="text-2xl serif text-[#4C3F91]">{totalExams}</p>
          <p className="text-xs text-neutral-400 mt-1">Exams created</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center">
          <p className="text-2xl serif text-[#4C3F91]">{totalStudents}</p>
          <p className="text-xs text-neutral-400 mt-1">Total attempts</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 mb-10">
        <a href="/examiner/create"
          className="rounded-xl bg-[#4C3F91] text-white p-5 text-center hover:bg-[#3d3277] transition">
          <p className="font-medium">+ Generate exam</p>
          <p className="text-xs text-white/70 mt-1">Create a new exam from material</p>
        </a>
        <a href="/examiner/history"
          className="rounded-xl border border-neutral-200 bg-white p-5 text-center hover:border-[#4C3F91] transition">
          <p className="font-medium text-neutral-900">View history</p>
          <p className="text-xs text-neutral-400 mt-1">All your past exams</p>
        </a>
      </div>

      {/* Recent exams with per-exam stats */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400 mb-3">Your exams</p>
        {exams.length === 0 ? (
          <p className="text-neutral-500 text-sm">You haven't created any exams yet.</p>
        ) : (
          <div className="space-y-3">
            {exams.map((e, i) => (
              <a key={i} href={`/examiner/results/${e.code}`}
                className="block rounded-xl border border-neutral-200 bg-white p-4 hover:border-[#4C3F91] transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Code: {e.code} · {new Date(e.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#4C3F91] font-medium text-sm">{e.studentCount} student{e.studentCount !== 1 ? "s" : ""}</p>
                    {e.avgPct !== null && <p className="text-xs text-neutral-400">avg {e.avgPct}%</p>}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}