'use client';

import { useState } from 'react';
import { useApiKey, useReviewState, useToast } from '@/lib/hooks';
import type { Conversation, DeadLetter, MeResponse, TabKey } from '@/lib/types';
import { TAB_CONFIG } from '@/lib/types';

import { ConversationCard } from './conversation-card';
import { FollowupsTab } from './followups-tab';
import { SentHistoryTab } from './sent-history-tab';
import { BookingModal } from './booking-modal';
import { ToastHost } from './toast-host';

export function ReviewShell() {
  const { apiKey, setApiKey } = useApiKey();
  const review = useReviewState(apiKey);
  const { toasts, addToast } = useToast();
  const [keyInput, setKeyInput] = useState('');

  // Booking modal state
  const [bookingTarget, setBookingTarget] = useState<{
    convId: string;
    email: string;
    name: string;
    persona: string;
    tz: string;
  } | null>(null);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput.trim()) setApiKey(keyInput.trim());
  };

  const tabCounts: Record<string, number> = {
    replies: review.counts.drafted,
    ready_to_send: review.counts.awaiting_send,
    nudges: review.counts.nudge_due,
    needs_josh: review.counts.needs_josh,
    snoozed: review.counts.snoozed,
    dead_letters: review.deadLetters?.length ?? 0,
    sent_history: 0,
  };

  /* ---- Shared card action handlers ---- */

  const handleSend = (convId: string, draftId: number, body?: string) => {
    review.sendDraft(convId, draftId, body).then((r) => {
      if (r) {
        addToast(
          r.edited
            ? `Sent — captured ${r.edit_distance ?? 0} char edits`
            : 'Sent — no edits, draft used as-is',
          'ok',
        );
      }
    });
  };

  const handleSaveEdit = (draftId: number, body: string) => {
    review.saveDraftEdit(draftId, body);
    addToast('Edit saved', 'ok');
  };

  const handleRegen = (convId: string) => {
    review.regenerateDraft(convId);
    addToast('Regen kicked off — refresh in 60s');
  };

  const handleArchive = (convId: string) => {
    review.archiveConversation(convId);
    addToast('Archived', 'ok');
  };

  const handleBook = (convId: string, email: string, name: string, persona: string, tz: string) =>
    setBookingTarget({ convId, email, name, persona, tz });

  const handleAssign = (convId: string, userId: number | null) =>
    review.assignConversation(convId, userId);

  const handleSaveNote = (convId: string, notes: string, version: number) =>
    review.saveNote(convId, notes, version);

  const handleRetry = () => {
    if (review.tab === 'sent_history') {
      review.loadSentHistory();
    } else if (review.tab === 'dead_letters') {
      review.loadDeadLetters();
    } else {
      review.loadQueue();
    }
  };
  const statusLooksRetryable = /\b(error|failed|unexpected|unauthorized|not found|timeout|request)\b/i.test(review.status);

  const cardProps = {
    onSend: handleSend,
    onSaveEdit: handleSaveEdit,
    onRegen: handleRegen,
    onArchive: handleArchive,
    onBook: handleBook,
    onAssign: handleAssign,
    onSaveNote: handleSaveNote,
    me: review.me,
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-7xl p-4">
        {/* ---- Header ---- */}
        <div className="mb-4 flex flex-wrap items-baseline gap-4">
          <h1 className="text-2xl font-semibold">Inbox v2</h1>
          {apiKey && (
            <>
              <button
                onClick={() => {
                  review.loadQueue();
                  review.refreshBatchState();
                  addToast('Refreshed', 'ok');
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Refresh + sync
              </button>
              <span className="text-xs text-zinc-500">
                {review.lastUpdate ? `Updated ${review.lastUpdate}` : ''}
              </span>
              {review.me && (
                <span className="text-xs text-zinc-600">{review.me.name}</span>
              )}
              {review.status && (
                <span className="text-xs text-zinc-500">{review.status}</span>
              )}
              {statusLooksRetryable && (
                <button
                  onClick={handleRetry}
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                >
                  Retry
                </button>
              )}
              <span className="ml-auto text-sm text-zinc-600">
                {review.counts.drafted} replies &middot; {review.counts.awaiting_send} ready &middot; {review.counts.nudge_due} follow-ups &middot; {review.counts.needs_josh} needs Josh
                {review.counts.snoozed > 0 && ` \u00B7 ${review.counts.snoozed} snoozed`}
              </span>
            </>
          )}
        </div>

        {/* ---- Auth ---- */}
        {!apiKey && (
          <form onSubmit={handleConnect} className="mb-6 flex items-center gap-3">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="API Key"
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm"
            />
            <button type="submit" className="rounded bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white">
              Connect
            </button>
            <span className="text-xs text-zinc-500">{review.status}</span>
          </form>
        )}

        {/* ---- Tabs ---- */}
        {apiKey && (
          <>
            <div className="mb-4 flex items-center gap-2 border-b border-zinc-200">
              {TAB_CONFIG.map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    review.setTab(t.key);
                    if (t.key === 'sent_history' && !review.sentHistory) {
                      review.loadSentHistory();
                    }
                    if (t.key === 'dead_letters' && !review.deadLetters) {
                      review.loadDeadLetters();
                    }
                  }}
                  className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    review.tab === t.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {t.label}
                  {tabCounts[t.key] > 0 && (
                    <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700">
                      {tabCounts[t.key]}
                    </span>
                  )}
                </button>
              ))}
              {review.allClients.length > 1 && (
                <select
                  value={review.clientFilter}
                  onChange={(e) => review.setClientFilter(e.target.value)}
                  className="ml-auto rounded border bg-white px-2 py-1 text-sm"
                >
                  <option value="">All clients</option>
                  {review.allClients.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>

            {/* ---- Tab Content ---- */}
            <div className="space-y-3">
              {review.tab === 'sent_history' ? (
                <SentHistoryTab items={review.sentHistory} clientFilter={review.clientFilter} />
              ) : review.tab === 'dead_letters' ? (
                <DeadLettersTab items={review.deadLetters} onRetry={review.retryDeadLetter} />
              ) : review.tab === 'nudges' ? (
                <FollowupsTab
                  items={review.getTabItems('nudges')}
                  batchState={review.batchState}
                  {...cardProps}
                />
              ) : (
                <CardList items={review.getTabItems(review.tab)} tab={review.tab} {...cardProps} />
              )}
            </div>
          </>
        )}
      </div>

      {/* ---- Booking Modal ---- */}
      {bookingTarget && (
        <BookingModal
          {...bookingTarget}
          onBook={async (startIso, endIso) => {
            const result = await review.bookSlot(
              bookingTarget.convId,
              startIso,
              endIso,
              bookingTarget.email,
              bookingTarget.name,
              bookingTarget.persona,
            );
            if (result?.ok) {
              addToast('Invite sent — confirmation drafted in Missive', 'ok');
              review.loadQueue();
            } else {
              addToast(`Booking failed: ${result?.error || 'unknown'}`, 'err');
            }
            setBookingTarget(null);
          }}
          onLoadSlots={() => review.loadFreeSlots(bookingTarget.tz)}
          onClose={() => setBookingTarget(null)}
        />
      )}

      <ToastHost toasts={toasts} />
    </div>
  );
}

function DeadLettersTab({
  items,
  onRetry,
}: {
  items: DeadLetter[] | null;
  onRetry: (deadLetterId: number) => void;
}) {
  if (!items) {
    return <p className="text-sm text-zinc-500">Loading dead letters...</p>;
  }
  if (!items.length) {
    return <p className="text-sm text-zinc-500">No dead letters.</p>;
  }
  return (
    <div className="overflow-hidden rounded border border-zinc-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
          <tr>
            <th className="px-3 py-2">Conversation</th>
            <th className="px-3 py-2">Transition</th>
            <th className="px-3 py-2">Reason</th>
            <th className="px-3 py-2">Detail</th>
            <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-3 py-2 font-mono text-xs">{item.conversation_id || '-'}</td>
              <td className="px-3 py-2">{item.from_state || '-'} {'->'} {item.to_state}</td>
              <td className="px-3 py-2">{item.reason}</td>
              <td className="max-w-md truncate px-3 py-2 text-zinc-600">{item.detail || '-'}</td>
              <td className="px-3 py-2 text-zinc-500">
                {item.created_at ? new Date(item.created_at * 1000).toLocaleString() : '-'}
              </td>
              <td className="px-3 py-2 text-right">
                {item.conversation_id ? (
                  <button
                    onClick={() => onRetry(item.id)}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                  >
                    Retry
                  </button>
                ) : (
                  <span className="text-xs text-zinc-400">Audit only</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---- Generic card list for replies / needs_josh / snoozed tabs ---- */

function CardList({
  items,
  tab,
  ...cardProps
}: {
  items: Conversation[];
  tab: TabKey;
  onSend: (convId: string, draftId: number, body?: string) => void;
  onSaveEdit: (draftId: number, body: string) => void;
  onRegen: (convId: string) => void;
  onArchive: (convId: string) => void;
  onBook: (convId: string, email: string, name: string, persona: string, tz: string) => void;
  onAssign: (convId: string, userId: number | null) => void;
  onSaveNote: (convId: string, notes: string, version: number) => void;
  me: MeResponse | null;
}) {
  if (!items.length) {
    const msgs: Record<string, string> = {
      replies: 'No reply drafts to review. All quiet.',
      ready_to_send: 'No approved drafts waiting to send.',
      needs_josh: 'No conversations need your attention right now.',
      snoozed: 'No snoozed conversations.',
    };
    return <div className="py-12 text-center text-zinc-500">{msgs[tab] || 'Nothing here.'}</div>;
  }

  return (
    <>
      {items.map((conv) => (
        <ConversationCard key={conv.id} conversation={conv} {...cardProps} />
      ))}
    </>
  );
}
