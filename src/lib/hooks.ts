'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { type ApiClient, ApiError, createApiClient } from './api';
import type {
  BatchStateResponse,
  Conversation,
  DeadLetter,
  MeResponse,
  QueueResponse,
  SentHistoryItem,
  TabKey,
} from './types';

/* ------------------------------------------------------------------ */
/*  useApiKey — persist review token in localStorage                   */
/* ------------------------------------------------------------------ */

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('t') || params.get('api_key');
    const fromStorage = localStorage.getItem('reviewApiKey');
    if (fromUrl) {
      localStorage.setItem('reviewApiKey', fromUrl);
      return fromUrl;
    }
    return fromStorage ?? '';
  });

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    localStorage.setItem('reviewApiKey', key);
  }, []);

  return { apiKey, setApiKey };
}

/* ------------------------------------------------------------------ */
/*  useToast — simple toast notification state                         */
/* ------------------------------------------------------------------ */

export interface ToastItem {
  id: number;
  message: string;
  kind: 'ok' | 'warn' | 'err';
}

let _toastSeq = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, kind: 'ok' | 'warn' | 'err' = 'ok') => {
    const id = ++_toastSeq;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return { toasts, addToast };
}

/* ------------------------------------------------------------------ */
/*  useReviewState — V1-style state management with tabs               */
/* ------------------------------------------------------------------ */

export function useReviewState(apiKey: string) {
  const [apiBaseUrl] = useState(
    () =>
      typeof window !== 'undefined'
        ? (new URLSearchParams(window.location.search).get('api_base') ??
          process.env.NEXT_PUBLIC_API_BASE_URL ??
          '/api/review')
        : '/api/review',
  );

  const [status, setStatus] = useState('Disconnected');
  const [tab, setTab] = useState<TabKey>('replies');
  const [clientFilter, setClientFilter] = useState('');
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [sentHistory, setSentHistory] = useState<SentHistoryItem[] | null>(null);
  const [deadLetters, setDeadLetters] = useState<DeadLetter[] | null>(null);
  const [batchState, setBatchState] = useState<BatchStateResponse | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const clientRef = useRef<ApiClient | null>(null);

  useEffect(() => {
    if (apiKey) {
      clientRef.current = createApiClient(apiBaseUrl, apiKey);
    } else {
      clientRef.current = null;
    }
  }, [apiKey, apiBaseUrl]);

  /* ---- Error wrapper ---- */

  const withError = useCallback(
    async <T>(fn: () => Promise<T>, loadingMsg?: string): Promise<T | null> => {
      if (loadingMsg) setStatus(loadingMsg);
      try {
        return await fn();
      } catch (err) {
        if (err instanceof ApiError) {
          setStatus(err.message);
        } else {
          setStatus('An unexpected error occurred.');
        }
        return null;
      }
    },
    [],
  );

  /* ---- Data loading ---- */

  const loadQueue = useCallback(async () => {
    const client = clientRef.current;
    if (!client) {
      setStatus('Enter an API key.');
      return;
    }
    const result = await withError(
      () => client.loadQueue(),
      'Loading queue...',
    );
    if (result) {
      setQueue(result);
      const total = Object.values(result.groups).flat().length;
      setStatus(`${total} conversations loaded.`);
      setLastUpdate(new Date().toLocaleTimeString());
    }
  }, [withError]);

  const loadSentHistory = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    const result = await withError(
      () => client.loadSentHistory(),
      'Loading sent history...',
    );
    if (result) {
      setSentHistory(result.drafts);
      setStatus(`${result.drafts.length} sent drafts.`);
    }
  }, [withError]);

  const loadDeadLetters = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    const result = await withError(
      () => client.loadDeadLetters(),
      'Loading dead letters...',
    );
    if (result) {
      setDeadLetters(result.dead_letters);
      setStatus(`${result.dead_letters.length} dead letters.`);
    }
  }, [withError]);

  const retryDeadLetter = useCallback(
    async (deadLetterId: number) => {
      const client = clientRef.current;
      if (!client) return null;
      const result = await withError(
        () => client.retryDeadLetter(deadLetterId),
        'Retrying dead letter...',
      );
      if (result) {
        const target = result.conversation_id ?? result.job_type ?? `dead letter ${deadLetterId}`;
        setStatus(`Retry queued for ${target}.`);
        await loadDeadLetters();
        await loadQueue();
      }
      return result;
    },
    [loadDeadLetters, loadQueue, withError],
  );

  const refreshBatchState = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    try {
      const bs = await client.loadBatchState();
      setBatchState(bs);
    } catch {
      // batch-state may not be available on all backends
    }
  }, []);

  const fetchMe = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    try {
      const m = await client.loadMe();
      if (m && m.id) setMe(m);
    } catch {
      // me endpoint may not exist
    }
  }, []);

  /* ---- Draft actions ---- */

  const sendDraft = useCallback(
    async (convId: string, draftId: number, body?: string) => {
      const client = clientRef.current;
      if (!client) return null;
      const conversation = queue
        ? Object.values(queue.groups)
            .flat()
            .find((item) => item.id === convId)
        : null;
      const draft = conversation?.current_draft;
      const needsMissiveApproval =
        !conversation ||
        conversation.state !== 'awaiting_send' ||
        !draft?.missive_draft_id;
      if (needsMissiveApproval) {
        setStatus('Approving draft in Missive...');
        try {
          await client.approveDraft(draftId);
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            // Legacy monolith deployments send directly from /send.
          } else {
            if (err instanceof ApiError) {
              setStatus(err.message);
            } else {
              setStatus('An unexpected error occurred.');
            }
            return null;
          }
        }
      }
      const result = await withError(
        () => client.sendDraft(draftId, body),
        'Sending...',
      );
      if (result) {
        await loadQueue();
      }
      return result;
    },
    [loadQueue, queue, withError],
  );

  const saveDraftEdit = useCallback(
    async (draftId: number, body: string) => {
      const client = clientRef.current;
      if (!client) return;
      await withError(
        () => client.saveDraft(draftId, body),
        'Saving edit...',
      );
      setStatus('Edit saved.');
    },
    [withError],
  );

  const regenerateDraft = useCallback(
    async (convId: string) => {
      const client = clientRef.current;
      if (!client) return;
      await withError(
        () => client.regenerateDraft(convId),
        'Regenerating...',
      );
      setStatus('Regen kicked off — refresh in 60s.');
    },
    [withError],
  );

  const archiveConversation = useCallback(
    async (convId: string) => {
      const client = clientRef.current;
      if (!client) return;
      await withError(
        () => client.archiveConversation(convId),
        'Archiving...',
      );
      await loadQueue();
    },
    [loadQueue, withError],
  );

  const saveNote = useCallback(
    async (convId: string, notes: string, version: number) => {
      const client = clientRef.current;
      if (!client) return;
      await withError(
        () => client.saveNotes(convId, notes, version),
        'Saving note...',
      );
      setStatus('Note saved.');
    },
    [withError],
  );

  const assignConversation = useCallback(
    async (convId: string, userId: number | null) => {
      const client = clientRef.current;
      if (!client) return;
      await withError(
        () => client.assignConversation(convId, userId),
        'Assigning...',
      );
      await loadQueue();
    },
    [loadQueue, withError],
  );

  const bookSlot = useCallback(
    async (convId: string, startIso: string, endIso: string, email: string, name: string, persona: string) => {
      const client = clientRef.current;
      if (!client) return null;
      return await withError(
        () => client.bookSlot(convId, startIso, endIso, email, name, persona),
        'Booking...',
      );
    },
    [withError],
  );

  const loadFreeSlots = useCallback(
    async (tz: string) => {
      const client = clientRef.current;
      if (!client) return null;
      return await withError(
        () => client.loadFreeSlots(tz),
        'Loading slots...',
      );
    },
    [withError],
  );

  /* ---- Auto-load & refresh intervals ---- */

  useEffect(() => {
    if (apiKey) {
      loadQueue();
      refreshBatchState();
      fetchMe();

      const queueInterval = setInterval(loadQueue, 60_000);
      const batchInterval = setInterval(refreshBatchState, 30_000);
      return () => {
        clearInterval(queueInterval);
        clearInterval(batchInterval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  /* ---- Derived data ---- */

  const allClients = (() => {
    if (!queue) return [];
    const codes = new Set<string>();
    for (const items of Object.values(queue.groups)) {
      for (const c of items) {
        if (c.client) codes.add(c.client);
      }
    }
    return [...codes].sort();
  })();

  const counts = (() => {
    if (!queue) return { drafted: 0, nudge_due: 0, needs_josh: 0, awaiting_send: 0, snoozed: 0, total: 0 };
    const g = queue.groups;
    return {
      drafted: (g.drafted || []).length,
      nudge_due: (g.nudge_due || []).length,
      needs_josh: (g.needs_josh || []).length,
      awaiting_send: (g.awaiting_send || []).length,
      snoozed: (g.snoozed || []).length,
      total: Object.values(g).flat().length,
    };
  })();

  /** Get conversations for the current tab, filtered by client */
  const getTabItems = useCallback(
    (tabKey: TabKey): Conversation[] => {
      if (!queue) return [];
      const stateMap: Record<string, string> = {
        replies: 'drafted',
        ready_to_send: 'awaiting_send',
        nudges: 'nudge_due',
        needs_josh: 'needs_josh',
        snoozed: 'snoozed',
      };
      const state = stateMap[tabKey];
      if (!state) return [];
      const items = queue.groups[state] || [];
      if (clientFilter) return items.filter((c) => c.client === clientFilter);
      return items;
    },
    [queue, clientFilter],
  );

  return {
    status,
    tab,
    setTab,
    clientFilter,
    setClientFilter,
    queue,
    sentHistory,
    deadLetters,
    batchState,
    me,
    lastUpdate,
    allClients,
    counts,
    getTabItems,
    loadQueue,
    loadSentHistory,
    loadDeadLetters,
    retryDeadLetter,
    refreshBatchState,
    sendDraft,
    saveDraftEdit,
    regenerateDraft,
    archiveConversation,
    saveNote,
    assignConversation,
    bookSlot,
    loadFreeSlots,
  };
}
