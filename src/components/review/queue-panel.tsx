'use client';

import { ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Conversation, QueueResponse } from '@/lib/types';
import { QUEUE_LABELS, QUEUE_ORDER } from '@/lib/types';
import { cn } from '@/lib/utils';

function orderedStates(groups: QueueResponse['groups'], states: string[]) {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const state of [...QUEUE_ORDER, ...states, ...Object.keys(groups)]) {
    if (!seen.has(state) && (groups[state] ?? []).length) {
      seen.add(state);
      ordered.push(state);
    }
  }
  return ordered;
}

function queueMeta(conversation: Conversation) {
  const parts = [conversation.client, conversation.prospect_email];
  if (
    conversation.attention_kind === 'followup_due' &&
    conversation.followup_cadence
  ) {
    parts.push(
      `follow-up stage ${conversation.followup_cadence.stage} due`,
    );
  } else if (conversation.attention_reason) {
    parts.push(conversation.attention_reason);
  } else if (
    conversation.needs_josh_reason_label ??
    conversation.needs_josh_reason
  ) {
    parts.push(
      (conversation.needs_josh_reason_label ??
        conversation.needs_josh_reason)!,
    );
  }
  return parts.filter(Boolean).join(' \u00b7 ');
}

interface QueuePanelProps {
  queue: QueueResponse | null;
  selectedId: string | null;
  onSelect: (conversationId: string) => void;
}

export function QueuePanel({ queue, selectedId, onSelect }: QueuePanelProps) {
  if (!queue) {
    return (
      <aside className="flex flex-col border-r border-border bg-muted/30">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3.5 sticky top-0 z-10">
          <h2 className="text-sm font-semibold">Queue</h2>
          <Badge variant="secondary" className="text-xs">
            0
          </Badge>
        </div>
      </aside>
    );
  }

  const total = Object.values(queue.groups).flat().length;
  const states = orderedStates(queue.groups, queue.states);

  return (
    <aside className="flex flex-col border-r border-border bg-muted/30 min-h-0">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3.5 sticky top-0 z-10">
        <h2 className="text-sm font-semibold">Queue</h2>
        <Badge variant="secondary" className="text-xs font-bold">
          {total}
        </Badge>
      </div>
      <ScrollArea className="flex-1">
        {states.map((state) => {
          const conversations = queue.groups[state] ?? [];
          if (!conversations.length) return null;
          return (
            <section key={state} className="border-b border-border">
              <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2">
                <span className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
                  {QUEUE_LABELS[state] ?? state}
                </span>
                <Badge variant="outline" className="text-xs">
                  {conversations.length}
                </Badge>
              </div>
              {conversations.map((conversation) => (
                <QueueRow
                  key={conversation.id}
                  conversation={conversation}
                  isActive={selectedId === conversation.id}
                  onSelect={onSelect}
                />
              ))}
            </section>
          );
        })}
      </ScrollArea>
    </aside>
  );
}

function QueueRow({
  conversation,
  isActive,
  onSelect,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] border-b border-border">
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        className={cn(
          'flex flex-col gap-1.5 px-4 py-3.5 text-left hover:bg-accent/50 transition-colors min-w-0',
          isActive && 'bg-accent',
        )}
      >
        <span className="text-sm font-bold truncate">
          {conversation.subject ?? conversation.prospect_email}
        </span>
        <span className="text-xs text-muted-foreground truncate">
          {queueMeta(conversation)}
        </span>
      </button>
      {conversation.missive_url ? (
        <a
          href={conversation.missive_url}
          target="_blank"
          rel="noopener noreferrer"
          title={conversation.missive_link_reason ?? undefined}
          className="flex items-center justify-center border-l border-border px-3 text-xs font-bold text-primary hover:underline max-w-[116px] truncate"
        >
          <ExternalLink className="mr-1 h-3 w-3 shrink-0" />
          {conversation.missive_link_label ?? 'Missive'}
        </a>
      ) : (
        <span
          className="flex items-center justify-center border-l border-border px-3 text-xs text-muted-foreground max-w-[116px]"
          title={
            conversation.missive_link_reason ?? 'Missive link unavailable'
          }
        >
          No Missive
        </span>
      )}
    </div>
  );
}
