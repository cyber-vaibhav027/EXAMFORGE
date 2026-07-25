export default function Watermark({ text }: { text: string }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden opacity-[0.06]"
      aria-hidden="true"
    >
      <div
        className="w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 flex flex-wrap content-start"
        style={{ transform: "rotate(-30deg)" }}
      >
        {Array.from({ length: 80 }).map((_, i) => (
          <span
            key={i}
            className="text-neutral-900 text-sm font-medium whitespace-nowrap px-8 py-6"
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}