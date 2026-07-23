import Link from "next/link";

export default function Home() {
  const card = "group rounded-2xl border border-neutral-200 bg-white p-8 hover:border-[#4C3F91] transition";
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="text-center mb-12">
        <p className="text-sm tracking-[0.2em] uppercase text-neutral-400 mb-3">ExamForge</p>
        <h1 className="serif text-5xl md:text-6xl leading-tight">Exams from your<br/>material, in minutes.</h1>
        <p className="text-neutral-500 mt-4 max-w-md mx-auto">Turn any notes into a ready exam. Choose who you are to begin.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 w-full max-w-2xl">
        <Link href="/examiner" className={card}>
          <h2 className="serif text-2xl mb-1">I&apos;m an examiner</h2>
          <p className="text-neutral-500 text-sm">Upload material and build an exam.</p>
          <span className="inline-block mt-6 text-[#4C3F91] text-sm group-hover:translate-x-1 transition">Continue →</span>
        </Link>
        <Link href="/student" className={card}>
          <h2 className="serif text-2xl mb-1">I&apos;m a student</h2>
          <p className="text-neutral-500 text-sm">Join an exam with a code.</p>
          <span className="inline-block mt-6 text-[#4C3F91] text-sm group-hover:translate-x-1 transition">Continue →</span>
        </Link>
      </div>
    </main>
  );
}