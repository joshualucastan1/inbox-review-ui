'use client';

import type { SentHistoryItem } from '@/lib/types';
import { inlineDiff } from '@/lib/helpers';

interface SentHistoryTabProps {
  items: SentHistoryItem[] | null;
  clientFilter: string;
}

export function SentHistoryTab({ items, clientFilter }: SentHistoryTabProps) {
  if (!items) {
    return <div className="py-12 text-center text-zinc-500">Loading sent history...</div>;
  }

  const filtered = clientFilter ? items.filter((r) => r.client === clientFilter) : items;
  const totalSent = items.length;
  const totalEdited = items.filter((r) => r.edited).length;
  const editRate = totalSent ? Math.round((totalEdited * 100) / totalSent) : 0;

  return (
    <>
      {/* ---- Summary card ---- */}
      <div className="mb-4 rounded-lg border bg-white p-4">
        <div className="mb-2 text-sm text-zinc-700">
          <strong>Learning loop status</strong> &mdash; {totalSent} sent, {totalEdited} edited ({editRate}% edit rate).
          The lower this number trends over the next week, the more the planner has learned your voice.
        </div>
      </div>

      {/* ---- Items ---- */}
      {!filtered.length ? (
        <div className="py-12 text-center text-zinc-500">
          No sends yet. Start approving drafts and the loop fills here.
        </div>
      ) : (
        filtered.slice(0, 80).map((r) => <SentHistoryCard key={r.id} item={r} />)
      )}
    </>
  );
}

function SentHistoryCard({ item: r }: { item: SentHistoryItem }) {
  const when = r.sent_at ? new Date(r.sent_at * 1000).toLocaleString() : '';

  if (r.edited && r.original_body && r.sent_body) {
    const diffHtml = inlineDiff(r.original_body, r.sent_body);
    return (
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-2 flex flex-wrap items-baseline gap-2 text-sm">
          <span className="font-semibold">{r.prospect_email || ''}</span>
          {r.client && <Badge className="bg-zinc-100">{r.client}</Badge>}
          <Badge className="bg-amber-100 text-amber-900">{r.intent}</Badge>
          <Badge className="bg-rose-100 text-rose-900">edited {r.edit_distance ?? '?'} chars</Badge>
          <span className="ml-auto text-xs text-zinc-500">{when}</span>
        </div>
        {r.subject && <div className="mb-1 text-xs text-zinc-500">{r.subject}</div>}
        <div
          className="rounded bg-zinc-50 p-2 font-mono text-[13px] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: diffHtml }}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="flex flex-wrap items-baseline gap-2 text-sm">
        <span className="font-semibold">{r.prospect_email || ''}</span>
        {r.client && <Badge className="bg-zinc-100">{r.client}</Badge>}
        <Badge className="bg-emerald-100 text-emerald-900">{r.intent} &middot; sent as-is</Badge>
        <span className="ml-auto text-xs text-zinc-500">{when}</span>
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs ${className || ''}`}>
      {children}
    </span>
  );
}
