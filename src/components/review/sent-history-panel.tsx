'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import type { Draft } from '@/lib/types';

interface SentHistoryPanelProps {
  drafts: Draft[];
}

export function SentHistoryPanel({ drafts }: SentHistoryPanelProps) {
  return (
    <aside className="flex flex-col border-r border-border bg-muted/30 min-h-0">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3.5 sticky top-0 z-10">
        <h2 className="text-sm font-semibold">Sent History</h2>
        <span className="text-xs font-bold text-muted-foreground">
          {drafts.length}
        </span>
      </div>
      <ScrollArea className="flex-1">
        {drafts.map((draft) => (
          <div
            key={draft.id}
            className="border-b border-border px-4 py-3.5 grid gap-1.5"
          >
            <span className="text-sm font-bold truncate">
              {draft.rendered_body || draft.intent}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              sent &middot; {draft.conversation_id} &middot;{' '}
              {draft.sent_by ?? 'unknown'}
            </span>
          </div>
        ))}
      </ScrollArea>
    </aside>
  );
}
