'use client';

import type { ToastItem } from '@/lib/hooks';

const KIND_COLORS: Record<string, string> = {
  ok: 'bg-green-600',
  warn: 'bg-amber-600',
  err: 'bg-red-600',
};

export function ToastHost({ toasts }: { toasts: ToastItem[] }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`max-w-[380px] rounded-lg px-4 py-2.5 text-sm text-white shadow-lg ${KIND_COLORS[t.kind] || 'bg-zinc-700'}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
