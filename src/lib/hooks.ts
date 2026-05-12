'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { type ApiClient, ApiError, createApiClient } from './api';
import type {
  Conversation,
  ConversationDetailResponse,
  Draft,
  QueueResponse,
} from './types';

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('api_key');
    const fromStorage = localStorage.getItem('reviewApiKey');
    if (fromUrl) {
      setApiKeyState(fromUrl);
      localStorage.setItem('reviewApiKey', fromUrl);
    } else if (fromStorage) {
      setApiKeyState(fromStorage);
    }
  }, []);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    localStorage.setItem('reviewApiKey', key);
  }, []);

  return { apiKey, setApiKey };
}

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
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [stateFilter, setStateFilter] = useState('');
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [sentHistory, setSentHistory] = useState<Draft[] | null>(null);

  const clientRef = useRef<ApiClient | null>(null);

  useEffect(() => {
    if (apiKey) {
      clientRef.current = createApiClient(apiBaseUrl, apiKey);
    } else {
      clientRef.current = null;
    }
  }, [apiKey, apiBaseUrl]);

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

  const loadQueue = useCallback(
    async (filter?: string) => {
      const client = clientRef.current;
      if (!client) {
        setStatus('Enter an API key.');
        return;
      }
      const result = await withError(
        () => client.loadQueue(filter ?? stateFilter),
        'Loading queue...',
      );
      if (result) {
        setQueue(result);
        setSentHistory(null);
        const total = Object.values(result.groups).flat().length;
        setStatus(`Loaded ${total} conversations.`);
      }
    },
    [stateFilter, withError],
  );

  const selectConversation = useCallback(
    async (conversationId: string) => {
      const client = clientRef.current;
      if (!client) return;
      const result = await withError<ConversationDetailResponse>(
        () => client.loadConversation(conversationId),
        'Loading conversation...',
      );
      if (result) {
        setSelectedConversation(result.conversation);
        setSelectedDraft(
          result.drafts.find((d) => !d.sent) ?? result.drafts[0] ?? null,
        );
        setStatus('Ready.');
      }
    },
    [withError],
  );

  const loadSentHistory = useCallback(async () => {
    const client = clientRef.current;
    if (!client) {
      setStatus('Enter an API key.');
      return;
    }
    const result = await withError(
      () => client.loadSentHistory(),
      'Loading sent history...',
    );
    if (result) {
      setSentHistory(result.drafts);
      setStatus(`Loaded ${result.drafts.length} sent drafts.`);
    }
  }, [withError]);

  const saveDraft = useCallback(
    async (body: string) => {
      const client = clientRef.current;
      if (!client || !selectedDraft) return;
      await withError(
        () => client.saveDraft(selectedDraft.id, body),
        'Saving draft...',
      );
      if (selectedConversation) {
        await selectConversation(selectedConversation.id);
      }
      setStatus('Draft saved.');
    },
    [selectedDraft, selectedConversation, selectConversation, withError],
  );

  const approveDraft = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !selectedDraft) return;
    await withError(
      () => client.approveDraft(selectedDraft.id),
      'Pushing to Missive...',
    );
    if (selectedConversation) {
      await selectConversation(selectedConversation.id);
    }
  }, [selectedDraft, selectedConversation, selectConversation, withError]);

  const sendDraft = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !selectedDraft) return;
    await withError(
      () => client.sendDraft(selectedDraft.id),
      'Marking sent...',
    );
    await loadQueue();
    if (selectedConversation) {
      await selectConversation(selectedConversation.id);
    }
  }, [
    selectedDraft,
    selectedConversation,
    selectConversation,
    loadQueue,
    withError,
  ]);

  const saveNotes = useCallback(
    async (notes: string) => {
      const client = clientRef.current;
      if (!client || !selectedConversation) return;
      await withError(
        () =>
          client.saveNotes(
            selectedConversation.id,
            notes,
            selectedConversation.notes_version,
          ),
        'Saving notes...',
      );
      await selectConversation(selectedConversation.id);
      setStatus('Notes saved.');
    },
    [selectedConversation, selectConversation, withError],
  );

  const regenerateDraft = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !selectedConversation) return;
    await withError(
      () => client.regenerateDraft(selectedConversation.id),
      'Regenerating draft...',
    );
    await loadQueue();
  }, [selectedConversation, loadQueue, withError]);

  const archiveConversation = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !selectedConversation) return;
    await withError(
      () => client.archiveConversation(selectedConversation.id),
      'Archiving...',
    );
    setSelectedConversation(null);
    setSelectedDraft(null);
    await loadQueue();
  }, [selectedConversation, loadQueue, withError]);

  const syncConversation = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !selectedConversation) return;
    await withError(
      () => client.syncConversation(selectedConversation.id),
      'Syncing...',
    );
    setStatus('Sync queued.');
  }, [selectedConversation, withError]);

  const assignConversation = useCallback(
    async (assignedTo: number | null) => {
      const client = clientRef.current;
      if (!client || !selectedConversation) return;
      await withError(
        () => client.assignConversation(selectedConversation.id, assignedTo),
        'Assigning...',
      );
      await selectConversation(selectedConversation.id);
    },
    [selectedConversation, selectConversation, withError],
  );

  const setBookingSignal = useCallback(
    async (signal: string | null) => {
      const client = clientRef.current;
      if (!client || !selectedConversation) return;
      await withError(
        () => client.setBookingSignal(selectedConversation.id, signal),
        'Saving booking...',
      );
      await selectConversation(selectedConversation.id);
    },
    [selectedConversation, selectConversation, withError],
  );

  // Auto-load queue when API key is set
  useEffect(() => {
    if (apiKey) {
      loadQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  return {
    status,
    queue,
    stateFilter,
    setStateFilter,
    selectedConversation,
    selectedDraft,
    sentHistory,
    loadQueue,
    selectConversation,
    loadSentHistory,
    saveDraft,
    approveDraft,
    sendDraft,
    saveNotes,
    regenerateDraft,
    archiveConversation,
    syncConversation,
    assignConversation,
    setBookingSignal,
  };
}
