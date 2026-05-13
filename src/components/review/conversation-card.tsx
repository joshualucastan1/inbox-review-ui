'use client';

import { useCallback, useRef, useState } from 'react';
import type { Conversation, MeResponse, ThreadMessage } from '@/lib/types';
import {
  fmtRelativeWhen,
  fmtRelativeUnix,
  simpleEditDistance,
  parseAttachmentNames,
  mentionsAttached,
} from '@/lib/helpers';

interface CardProps {
  conversation: Conversation;
  onSend: (convId: string, draftId: number, body?: string) => void;
  onSaveEdit: (draftId: number, body: string) => void;
  onRegen: (convId: string) => void;
  onArchive: (convId: string) => void;
  onBook: (convId: string, email: string, name: string, persona: string, tz: string) => void;
  onAssign: (convId: string, userId: number | null) => void;
  onSaveNote: (convId: string, notes: string, version: number) => void;
  me: MeResponse | null;
}

export function ConversationCard({
  conversation: d,
  onSend,
  onSaveEdit,
  onRegen,
  onArchive,
  onBook,
  onAssign,
  onSaveNote,
  me,
}: CardProps) {
  const draft = d.current_draft;
  const draftBody = draft?.rendered_body ?? d.body ?? '';
  const draftId = draft?.id ?? d.draft_id;
  const intent = draft?.intent ?? d.intent ?? d.state;
  const attachments = draft?.attachments ?? d.attachments;
  const email = d.prospect_email ?? d.email ?? '';
  const name = d.prospect_name ?? '';

  const [editBody, setEditBody] = useState(draftBody);
  const [editDist, setEditDist] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBodyChange = useCallback(
    (value: string) => {
      setEditBody(value);
      setEditDist(simpleEditDistance(draftBody, value));
    },
    [draftBody],
  );

  const handleNoteSave = useCallback(
    (notes: string) => {
      if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
      noteTimerRef.current = setTimeout(() => {
        onSaveNote(d.id, notes, d.notes_version);
      }, 800);
    },
    [d.id, d.notes_version, onSaveNote],
  );

  /* ---- Attachment block ---- */
  const atts = parseAttachmentNames(attachments);
  const attBlock = atts.length > 0 ? (
    <div className="mb-2 flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-sm">
      <span className="text-emerald-700">&#x1F4CE;</span>
      <span className="font-medium text-emerald-900">Attached:</span>
      <span className="text-emerald-800">{atts.join(', ')}</span>
    </div>
  ) : mentionsAttached(draftBody) ? (
    <div className="mb-2 flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-sm">
      <span className="text-amber-700">&#x26A0;&#xFE0F;</span>
      <span className="text-amber-900">Draft mentions an attachment but no file is attached. Regenerate or attach manually in Missive.</span>
    </div>
  ) : null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" data-conv={d.id}>
      {/* ---- Header row ---- */}
      <div className="mb-2 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">
            {name || email}{' '}
            <span className="text-sm font-normal text-zinc-400">&middot; {email}</span>
          </div>
          <div className="truncate text-sm text-zinc-600">{d.subject || ''}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
            {/* Priority badges */}
            {d.priority != null && d.priority >= 100 && (
              <Badge className="bg-rose-100 font-semibold text-rose-900">DROPPED BALL</Badge>
            )}
            {d.priority != null && d.priority >= 80 && (d.priority ?? 0) < 100 && (
              <Badge className="bg-orange-100 font-semibold text-orange-900">REPLY OWED</Badge>
            )}
            {d.booking_signal && (
              <Badge className="bg-emerald-100 font-semibold text-emerald-900">BOOKING SIGNAL</Badge>
            )}
            {d.snoozed_until && (
              <Badge className="bg-purple-100 text-purple-900">
                snoozed until {new Date(d.snoozed_until * 1000).toLocaleDateString()}
              </Badge>
            )}
            <Badge className="bg-zinc-100">{d.client || ''}</Badge>
            <Badge className="bg-zinc-100">{intent || d.state}</Badge>
            {d.nudge_stage != null && d.nudge_stage > 0 && (
              <Badge className="bg-amber-100 text-amber-900">cadence {d.nudge_stage}/7</Badge>
            )}
            {d.tz && (
              <span>
                TZ: {d.tz}{' '}
                <span className="text-zinc-400">({d.tz_source || '?'})</span>
              </span>
            )}
            {d.persona && <span>{d.persona}</span>}
            {d.company && <span>{d.company}</span>}
            {d.assigned_to ? (
              <Badge className="bg-indigo-100 text-indigo-900">
                {d.assigned_name || 'user'}
              </Badge>
            ) : (
              <Badge className="bg-zinc-50 text-zinc-400">unassigned</Badge>
            )}
          </div>
        </div>
        {d.missive_url && (
          <a
            href={d.missive_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-sm text-blue-600 hover:underline"
          >
            Open in Missive &#x2197;
          </a>
        )}
      </div>

      {/* ---- Needs Josh reason ---- */}
      {d.needs_josh_reason && (
        <div className="mb-2 rounded border-l-4 border-amber-500 bg-amber-50 p-2 text-xs text-amber-900">
          <strong>Needs Josh:</strong> {d.needs_josh_reason}
        </div>
      )}

      {/* ---- Looped-in badge ---- */}
      <LoopedInBadge thread={d.thread} email={email} />

      {/* ---- Thread preview ---- */}
      <ThreadPreview thread={d.thread} />

      {/* ---- Attachment block ---- */}
      {attBlock}

      {/* ---- Draft textarea + edit distance ---- */}
      {draftId ? (
        <>
          <textarea
            value={editBody}
            onChange={(e) => handleBodyChange(e.target.value)}
            className="mb-1 w-full rounded border p-3 font-mono text-[13px] leading-relaxed"
            rows={7}
          />
          <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
            {editDist === 0 ? (
              <>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium">No edits yet</span>
                <span className="text-zinc-400">&mdash; learning loop captures on Send</span>
              </>
            ) : (
              <>
                <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-900">
                  {editDist} char{editDist === 1 ? '' : 's'} different from AI draft
                </span>
                <span className="text-zinc-400">&mdash; captured for learning when you Approve &amp; Send</span>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="mb-2 text-sm italic text-zinc-500">
          No draft yet (will regenerate or needs Josh).
        </div>
      )}

      {/* ---- Notes ---- */}
      <NoteEditor
        notes={d.notes}
        onSave={(notes) => handleNoteSave(notes)}
        statusMsg={statusMsg}
      />

      {/* ---- Action buttons ---- */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {draftId && (
          <button
            className="btn bg-emerald-600 text-white"
            onClick={() => {
              if (!confirm('Send this email now?')) return;
              onSend(d.id, draftId, editBody !== draftBody ? editBody : undefined);
            }}
          >
            Approve &amp; Send
          </button>
        )}
        {draftId && (
          <button
            className="btn bg-zinc-100"
            onClick={() => {
              onSaveEdit(draftId, editBody);
              setStatusMsg('Edit saved');
              setTimeout(() => setStatusMsg(''), 2000);
            }}
          >
            Save Edit
          </button>
        )}
        <button className="btn bg-zinc-100" onClick={() => {
          if (!confirm('Regenerate this draft via the v2 pipeline?')) return;
          onRegen(d.id);
        }}>
          Regenerate
        </button>
        <button
          className="btn bg-blue-100 text-blue-900"
          onClick={() => onBook(d.id, email, name, d.persona || 'Joshua', d.tz || 'ET')}
        >
          Book slot
        </button>
        {d.assigned_to ? (
          <button className="btn bg-zinc-50 text-xs text-zinc-500" onClick={() => onAssign(d.id, null)}>
            Unclaim
          </button>
        ) : (
          <button
            className="btn bg-indigo-50 text-xs text-indigo-700"
            onClick={() => onAssign(d.id, me?.id ? Number(me.id) : null)}
          >
            Claim
          </button>
        )}
        <button className="btn ml-auto bg-zinc-100" onClick={() => {
          if (!confirm('Archive this conversation?')) return;
          onArchive(d.id);
        }}>
          Archive
        </button>
        {statusMsg && <span className="ml-2 text-xs text-zinc-500">{statusMsg}</span>}
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`rounded px-1.5 py-0.5 ${className || ''}`}>
      {children}
    </span>
  );
}

function LoopedInBadge({ thread, email }: { thread?: ThreadMessage[]; email: string }) {
  if (!thread?.length) return null;
  const senders = new Set<string>();
  for (const m of thread) {
    if (m.direction === 'PROSPECT' && m.address) senders.add(m.address);
  }
  if (senders.size < 2) return null;
  return (
    <div className="mb-2 flex items-center gap-2 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-sm">
      <span className="text-blue-700">&#x1F501;</span>
      <span className="text-blue-900">
        <strong>Looped-in thread:</strong> {senders.size} external participants &mdash; replying to {email}, others on CC
      </span>
    </div>
  );
}

function ThreadPreview({ thread }: { thread?: ThreadMessage[] }) {
  if (!thread?.length) return null;
  const recent = thread.slice(-3);
  const hasMore = thread.length > 3;

  return (
    <details className="mb-2" open>
      <summary className="cursor-pointer text-xs font-medium text-zinc-600">
        Thread (last {recent.length} of {thread.length})
      </summary>
      <div className="mt-1">
        {recent.map((m, i) => (
          <div
            key={i}
            className={`my-1 rounded-r border-l-4 p-2 text-xs ${
              m.direction === 'PROSPECT'
                ? 'border-blue-400 bg-blue-50'
                : 'border-zinc-300 bg-zinc-50'
            }`}
          >
            <div className="font-semibold text-zinc-700">
              {m.direction === 'PROSPECT' ? 'PROSPECT' : 'US'} &middot; {m.sender || ''}{' '}
              <span className="ml-1 font-normal text-zinc-500">{fmtRelativeWhen(m.when_iso)}</span>
            </div>
            <div className="mt-1 whitespace-pre-wrap text-zinc-800">{m.body || ''}</div>
          </div>
        ))}
        {hasMore && (
          <div className="mt-1 text-xs text-zinc-500">
            {thread.length - 3} earlier message(s) &mdash; open in Missive for full history
          </div>
        )}
      </div>
    </details>
  );
}

function NoteEditor({
  notes,
  onSave,
  statusMsg,
}: {
  notes: string;
  onSave: (notes: string) => void;
  statusMsg: string;
}) {
  const [value, setValue] = useState(notes || '');

  return (
    <details className="mb-2 mt-2" open={!!notes}>
      <summary className="cursor-pointer text-xs font-medium text-zinc-600">
        Your notes {notes ? <span className="text-emerald-600">(saved)</span> : ''}
      </summary>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onSave(e.target.value);
        }}
        placeholder="Add context, instructions, reminders"
        rows={2}
        className="mt-1 w-full rounded border border-zinc-300 p-2 text-xs"
      />
    </details>
  );
}
