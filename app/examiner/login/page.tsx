"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ExaminerLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<"login"|"signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const field = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#4C3F91]";

  async function handleSubmit() {
    setLoading(true); setError("");
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      setLoading(false);
      if (error) { setError(error.message); return; }
      router.push("/examiner");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) { setError(error.message); return; }
      router.push("/examiner");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8">
        <h1 className="serif text-3xl mb-1">{mode === "login" ? "Welcome back" : "Create account"}</h1>
        <p className="text-neutral-500 text-sm mb-6">
          {mode === "login" ? "Log in to manage your exams." : "Sign up to start creating exams."}
        </p>

        {mode === "signup" && (
          <>
            <label className="text-sm text-neutral-600">Name</label>
            <input className={`${field} mb-4`} value={name} onChange={e=>setName(e.target.value)} />
          </>
        )}
        <label className="text-sm text-neutral-600">Email</label>
        <input type="email" className={`${field} mb-4`} value={email} onChange={e=>setEmail(e.target.value)} />
        <label className="text-sm text-neutral-600">Password</label>
        <input type="password" className={`${field} mb-4`} value={password} onChange={e=>setPassword(e.target.value)} />

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <button onClick={handleSubmit} disabled={loading || !email || !password || (mode==="signup" && !name)}
          className="w-full rounded-lg bg-[#4C3F91] text-white px-5 py-2.5 text-sm font-medium disabled:opacity-40">
          {loading ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
        </button>

        <p className="text-sm text-neutral-500 mt-4 text-center">
          {mode === "login" ? (
            <>New here? <button onClick={()=>setMode("signup")} className="text-[#4C3F91] underline">Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={()=>setMode("login")} className="text-[#4C3F91] underline">Log in</button></>
          )}
        </p>
      </div>
    </main>
  );
}