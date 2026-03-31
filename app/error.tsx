"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4">
      <p className="text-4xl font-bold mb-4">Oops</p>
      <p className="text-lg mb-6 text-slate-500 dark:text-slate-400">Something went wrong</p>
      <button
        onClick={reset}
        className="text-sm px-4 py-2 rounded-lg border transition bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        Try again
      </button>
    </div>
  );
}
