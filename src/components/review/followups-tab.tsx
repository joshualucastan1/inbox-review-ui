'use client';

import type { BatchStateResponse, Conversation, MeResponse } from '@/lib/types';
import { REGION_META, REGION_OF_TZ, FE_TO_SCHED_REGION } from '@/lib/types';
import { fmtUntil, fmtDuration } from '@/lib/helpers';
import { ConversationCard } from './conversation-card';

interface FollowupsTabProps {
  items: Conversation[];
  batchState: BatchStateResponse | null;
  onSend: (convId: string, draftId: number, body?: string) => void;
  onSaveEdit: (draftId: number, body: string) => void;
  onRegen: (convId: string) => void;
  onArchive: (convId: string) => void;
  onBook: (convId: string, email: string, name: string, persona: string, tz: string) => void;
  onAssign: (convId: string, userId: number | null) => void;
  onSaveNote: (convId: string, notes: string, version: number) => void;
  me: MeResponse | null;
}

function regionOfItem(d: Conversation): string {
  const tz = (d.tz || '').toUpperCase();
  return REGION_OF_TZ[tz] || 'none';
}

export function FollowupsTab({
  items,
  batchState,
  onSend,
  onSaveEdit,
  onRegen,
  onArchive,
  onBook,
  onAssign,
  onSaveNote,
  me,
}: FollowupsTabProps) {
  if (!items.length) {
    return (
      <div className="py-12 text-center text-zinc-500">
        No follow-ups to review. Cadence drafts appear here when scheduled.
      </div>
    );
  }

  // Bucket by region
  const buckets: Record<string, Conversation[]> = { asia: [], eumea: [], na: [], none: [] };
  for (const d of items) {
    const region = regionOfItem(d);
    (buckets[region] ??= []).push(d);
  }

  const regionOrder = ['asia', 'eumea', 'na', 'none'] as const;

  return (
    <>
      {regionOrder.map((region) => {
        const regionItems = buckets[region];
        if (!regionItems?.length) return null;
        const meta = REGION_META[region];

        return (
          <div key={region} className="mb-6">
            {/* Region header */}
            <div className="mb-3 flex items-center border-b-2 border-zinc-300 pb-2">
              <h2 className="text-lg font-bold text-zinc-800">{meta.label}</h2>
              <BatchBadge region={region} batchState={batchState} />
              <span className="ml-auto text-sm text-zinc-500">{regionItems.length}</span>
            </div>
            <div className="mb-3 text-xs text-zinc-500">
              {region === 'none' ? (
                "These don't fit any batch window \u2014 set TZ via the prospect editor to bring them into a cadence"
              ) : (
                <>
                  Daily batch fires at <strong>{meta.batch}</strong> &middot; {regionItems.length} follow-up{regionItems.length === 1 ? '' : 's'} for review
                </>
              )}
            </div>
            <div className="space-y-3">
              {regionItems.map((conv) => (
                <ConversationCard
                  key={conv.id}
                  conversation={conv}
                  onSend={onSend}
                  onSaveEdit={onSaveEdit}
                  onRegen={onRegen}
                  onArchive={onArchive}
                  onBook={onBook}
                  onAssign={onAssign}
                  onSaveNote={onSaveNote}
                  me={me}
                />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ---- Batch status badge per region ---- */

function BatchBadge({
  region,
  batchState,
}: {
  region: string;
  batchState: BatchStateResponse | null;
}) {
  if (region === 'none' || !batchState?.regions) return null;
  const sched = FE_TO_SCHED_REGION[region];
  const st = sched ? batchState.regions[sched] : null;
  if (!st) return null;
  const nowTs = batchState.server_now_ts;

  if (st.state === 'running') {
    const elapsed = st.started_at ? fmtDuration(nowTs - st.started_at) : '';
    return (
      <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
        RUNNING NOW{elapsed ? ` \u00B7 ${elapsed}` : ''}
      </span>
    );
  }

  if (st.state === 'failed') {
    return (
      <>
        <span
          className="ml-2 rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-900"
          title={st.err_message || ''}
        >
          LAST RUN FAILED
        </span>
        {st.next_fire_ts && (
          <span className="ml-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-900">
            NEXT BATCH IN {fmtUntil(st.next_fire_ts, nowTs)}
          </span>
        )}
      </>
    );
  }

  if (st.state === 'completed') {
    const fired = st.fired != null ? `${st.fired} drafted` : 'no drafts';
    const dur = fmtDuration(st.duration_sec ?? 0);
    return (
      <>
        <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
          last run: {fired} in {dur}
        </span>
        {st.next_fire_ts && (
          <span className="ml-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-900">
            NEXT BATCH IN {fmtUntil(st.next_fire_ts, nowTs)}
          </span>
        )}
      </>
    );
  }

  // never_run or unknown
  if (st.next_fire_ts) {
    return (
      <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-900">
        NEXT BATCH IN {fmtUntil(st.next_fire_ts, nowTs)}
      </span>
    );
  }

  return null;
}
