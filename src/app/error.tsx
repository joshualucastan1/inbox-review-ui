'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 text-zinc-900">
      <section className="w-full max-w-md rounded border border-zinc-200 bg-white p-5">
        <h1 className="text-lg font-semibold">Review UI error</h1>
        <p className="mt-2 text-sm text-zinc-600">Something went wrong while loading the dashboard.</p>
        <button
          onClick={reset}
          className="mt-4 rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
        >
          Retry
        </button>
      </section>
    </main>
  );
}
