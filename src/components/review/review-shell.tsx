'use client';

import { useApiKey, useReviewState } from '@/lib/hooks';

import { DetailPanel } from './detail-panel';
import { QueuePanel } from './queue-panel';
import { SentHistoryPanel } from './sent-history-panel';
import { Toolbar } from './toolbar';
import { Topbar } from './topbar';

export function ReviewShell() {
  const { apiKey, setApiKey } = useApiKey();
  const state = useReviewState(apiKey);

  const handleFilterChange = (value: string) => {
    state.setStateFilter(value);
    state.loadQueue(value);
  };

  return (
    <main className="grid min-h-screen grid-rows-[auto_auto_1fr]">
      <Topbar
        apiKey={apiKey}
        status={state.status}
        onConnect={setApiKey}
      />
      <Toolbar
        stateFilter={state.stateFilter}
        onFilterChange={handleFilterChange}
        onRefresh={() => state.loadQueue()}
        onSentHistory={state.loadSentHistory}
      />
      <section
        className="grid min-h-0 grid-cols-1 md:grid-cols-[minmax(280px,360px)_1fr]"
        aria-label="Review workspace"
      >
        {state.sentHistory ? (
          <SentHistoryPanel drafts={state.sentHistory} />
        ) : (
          <QueuePanel
            queue={state.queue}
            selectedId={state.selectedConversation?.id ?? null}
            onSelect={state.selectConversation}
          />
        )}
        <DetailPanel
          conversation={state.selectedConversation}
          draft={state.selectedDraft}
          onSaveDraft={state.saveDraft}
          onApproveDraft={state.approveDraft}
          onSendDraft={state.sendDraft}
          onSaveNotes={state.saveNotes}
          onRegenerate={state.regenerateDraft}
          onArchive={state.archiveConversation}
          onSync={state.syncConversation}
          onAssign={state.assignConversation}
          onSetBooking={state.setBookingSignal}
        />
      </section>
    </main>
  );
}
