'use client';

import { useState } from 'react';
import { Archive, ExternalLink, RefreshCw, Send, Upload } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type { Conversation, Draft } from '@/lib/types';
import { BOOKING_SIGNALS } from '@/lib/types';

interface DetailPanelProps {
  conversation: Conversation | null;
  draft: Draft | null;
  onSaveDraft: (body: string) => Promise<void>;
  onApproveDraft: () => Promise<void>;
  onSendDraft: () => Promise<void>;
  onSaveNotes: (notes: string) => Promise<void>;
  onRegenerate: () => Promise<void>;
  onArchive: () => Promise<void>;
  onSync: () => Promise<void>;
  onAssign: (assignedTo: number | null) => Promise<void>;
  onSetBooking: (signal: string | null) => Promise<void>;
}

export function DetailPanel({
  conversation,
  draft,
  onSaveDraft,
  onApproveDraft,
  onSendDraft,
  onSaveNotes,
  onRegenerate,
  onArchive,
  onSync,
  onAssign,
  onSetBooking,
}: DetailPanelProps) {
  if (!conversation) {
    return (
      <section className="flex-1 p-5 md:p-6">
        <p className="py-8 text-muted-foreground">Select a conversation.</p>
      </section>
    );
  }

  return (
    <section className="flex-1 overflow-auto p-5 md:p-6">
      <div className="grid gap-5 max-w-[980px]">
        <ConversationHeader
          conversation={conversation}
          draft={draft}
          onSync={onSync}
          onArchive={onArchive}
        />
        <Separator />
        <WorkflowControls
          conversation={conversation}
          onAssign={onAssign}
          onSetBooking={onSetBooking}
        />
        <Separator />
        <DraftEditor
          conversation={conversation}
          draft={draft}
          onSave={onSaveDraft}
          onApprove={onApproveDraft}
          onSend={onSendDraft}
          onRegen={onRegenerate}
        />
        <Separator />
        <NotesEditor conversation={conversation} onSave={onSaveNotes} />
      </div>
    </section>
  );
}

function ConversationHeader({
  conversation,
  draft,
  onSync,
  onArchive,
}: {
  conversation: Conversation;
  draft: Draft | null;
  onSync: () => Promise<void>;
  onArchive: () => Promise<void>;
}) {
  const reason =
    conversation.needs_josh_reason_label ?? conversation.needs_josh_reason;
  const metaParts = [
    conversation.client,
    conversation.prospect_email,
    reason,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-base font-semibold truncate">
          {conversation.subject ?? conversation.prospect_email}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {metaParts.join(' \u00b7 ')}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          {conversation.missive_url ? (
            <a
              href={conversation.missive_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              title={conversation.missive_link_reason ?? undefined}
            >
              <ExternalLink className="h-3 w-3" />
              {conversation.missive_link_label ?? 'Open lead in Missive'}
            </a>
          ) : (
            <span
              className="text-xs text-muted-foreground"
              title={
                conversation.missive_link_reason ?? 'Missive link unavailable'
              }
            >
              No Missive link
            </span>
          )}
          {draft?.missive_draft_id && (
            <span className="text-xs text-muted-foreground">
              Missive draft: {draft.missive_draft_id}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="secondary" className="whitespace-nowrap">
          {conversation.state}
        </Badge>
        <Button variant="outline" size="sm" onClick={onSync}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          Sync
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onArchive}
        >
          <Archive className="mr-1 h-3.5 w-3.5" />
          Archive
        </Button>
      </div>
    </div>
  );
}

function WorkflowControls({
  conversation,
  onAssign,
  onSetBooking,
}: {
  conversation: Conversation;
  onAssign: (assignedTo: number | null) => Promise<void>;
  onSetBooking: (signal: string | null) => Promise<void>;
}) {
  const [assignInput, setAssignInput] = useState(
    conversation.assigned_to?.toString() ?? '',
  );
  const [bookingValue, setBookingValue] = useState(
    conversation.booking_signal ?? '',
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground shrink-0">
          Assignee
        </label>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="User id"
          className="h-8 w-24"
          value={assignInput}
          onChange={(e) => setAssignInput(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onAssign(assignInput.trim() ? Number(assignInput) : null)
          }
        >
          Assign
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground shrink-0">
          Booking
        </label>
        <Select value={bookingValue} onValueChange={(v) => setBookingValue(v ?? '')}>
          <SelectTrigger className="h-8 w-48">
            <SelectValue placeholder="No signal" />
          </SelectTrigger>
          <SelectContent>
            {BOOKING_SIGNALS.map((s) => (
              <SelectItem key={s.value} value={s.value || '_none'}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onSetBooking(
              bookingValue && bookingValue !== '_none' ? bookingValue : null,
            )
          }
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function DraftEditor({
  conversation,
  draft,
  onSave,
  onApprove,
  onSend,
  onRegen,
}: {
  conversation: Conversation;
  draft: Draft | null;
  onSave: (body: string) => Promise<void>;
  onApprove: () => Promise<void>;
  onSend: () => Promise<void>;
  onRegen: () => Promise<void>;
}) {
  const [body, setBody] = useState(draft?.rendered_body ?? '');

  // Sync local body when draft changes externally
  const draftId = draft?.id;
  const [prevDraftId, setPrevDraftId] = useState(draftId);
  if (draftId !== prevDraftId) {
    setPrevDraftId(draftId);
    setBody(draft?.rendered_body ?? '');
  }

  const isAwaitingSend = conversation.state === 'awaiting_send';

  return (
    <div className="grid gap-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold">Draft</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!draft}
            onClick={() => onSave(body)}
          >
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-amber-600 hover:text-amber-700"
            onClick={onRegen}
          >
            Regen
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-primary hover:text-primary/80"
            disabled={!draft || isAwaitingSend}
            onClick={onApprove}
          >
            <Upload className="mr-1 h-3.5 w-3.5" />
            Push Missive
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-green-600 hover:text-green-700"
            disabled={!draft || !isAwaitingSend}
            onClick={onSend}
          >
            <Send className="mr-1 h-3.5 w-3.5" />
            Mark sent
          </Button>
        </div>
      </div>
      <Textarea
        rows={13}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="font-mono text-sm leading-relaxed"
        disabled={!draft}
      />
    </div>
  );
}

function NotesEditor({
  conversation,
  onSave,
}: {
  conversation: Conversation;
  onSave: (notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(conversation.notes ?? '');

  const conversationId = conversation.id;
  const [prevId, setPrevId] = useState(conversationId);
  if (conversationId !== prevId) {
    setPrevId(conversationId);
    setNotes(conversation.notes ?? '');
  }

  return (
    <div className="grid gap-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Notes</h3>
        <Button variant="outline" size="sm" onClick={() => onSave(notes)}>
          Save note
        </Button>
      </div>
      <Textarea
        rows={5}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="text-sm"
      />
    </div>
  );
}
