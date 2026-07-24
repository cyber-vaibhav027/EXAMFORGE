"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Exam = { code: string; title: string; created_at: string; duration_minutes: number };

export default function History() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/examiner/login"); return; }
      const res = await fetch(`/api/exams?examinerId=${data.user.id}`);
      const d = await res.json();
      setExams(d.exams || []);
      setLoading(false);
    });
  }, []);

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="serif text-4xl md:text-5xl mb-2">Exam history</h1>
          <p className="text-neutral-500">All exams you've published.</p>
        </div>
        <a href="/examiner" className="text-sm text-[#4C3F91] underline whitespace-nowrap">
          ← Back to dashboard
        </a>
      </div>

      {loading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : exams.length === 0 ? (
        <p className="text-neutral-500">No exams published yet.</p>
      ) : (
        <div className="space-y-3">
          {exams.map((e, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-neutral-400">
                  Code: {e.code} · {e.duration_minutes} min · {new Date(e.created_at).toLocaleDateString()}
                </p>
              </div>
              <a href={`/examiner/results/${e.code}`} className="text-sm text-[#4C3F91] underline">
                View results
              </a>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}