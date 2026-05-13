import type {
  BatchStateResponse,
  BookResponse,
  ConversationDetailResponse,
  DeadLettersResponse,
  FreeSlotsResponse,
  MeResponse,
  QueueResponse,
  SentHistoryResponse,
} from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createApiClient(baseUrl: string, apiKey: string) {
  async function fetchJson<T>(
    path: string,
    options: { method?: string; body?: Record<string, unknown> } = {},
  ): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new ApiError(
        payload.error ?? 'Request failed',
        response.status,
      );
    }
    return payload as T;
  }

  return {
    /* ---- Queue & Conversations ---- */

    loadQueue(state?: string) {
      const params = new URLSearchParams();
      if (state) params.append('state', state);
      return fetchJson<QueueResponse>(`/queue?${params.toString()}`);
    },

    loadConversation(conversationId: string) {
      return fetchJson<ConversationDetailResponse>(
        `/conversations/${conversationId}`,
      );
    },

    /* ---- Drafts ---- */

    saveDraft(draftId: number, renderedBody: string) {
      return fetchJson<{ draft: unknown }>(`/drafts/${draftId}`, {
        method: 'PATCH',
        body: { rendered_body: renderedBody },
      });
    },

    approveDraft(draftId: number) {
      return fetchJson<{
        conversation_id: string;
        missive_draft_id: string;
        state: string;
      }>(`/drafts/${draftId}/approve`, { method: 'POST', body: {} });
    },

    sendDraft(draftId: number, body?: string) {
      return fetchJson<{
        conversation_id: string;
        duplicate: boolean;
        state: string;
        edited?: boolean;
        edit_distance?: number;
      }>(`/drafts/${draftId}/send`, {
        method: 'POST',
        body: { sent_by: 'Review UI', ...(body ? { body } : {}) },
      });
    },

    /* ---- Notes ---- */

    saveNotes(
      conversationId: string,
      notes: string,
      expectedVersion: number,
    ) {
      return fetchJson<{ conversation: unknown }>(
        `/conversations/${conversationId}/notes`,
        { method: 'POST', body: { notes, expected_version: expectedVersion } },
      );
    },

    /* ---- Actions ---- */

    regenerateDraft(conversationId: string) {
      return fetchJson<{ conversation_id: string; job_id: number | null }>(
        `/conversations/${conversationId}/regen`,
        { method: 'POST', body: { reason: 'review_ui_regen' } },
      );
    },

    archiveConversation(conversationId: string) {
      return fetchJson<{ conversation_id: string; state: string }>(
        `/conversations/${conversationId}/archive`,
        { method: 'POST', body: { reason: 'review_ui_archive' } },
      );
    },

    syncConversation(conversationId: string) {
      return fetchJson<{ conversation_id: string; job_id: number }>(
        `/conversations/${conversationId}/sync`,
        { method: 'POST', body: {} },
      );
    },

    assignConversation(conversationId: string, assignedTo: number | null) {
      return fetchJson<{ conversation: unknown }>(
        `/conversations/${conversationId}/assign`,
        { method: 'POST', body: { assigned_to: assignedTo } },
      );
    },

    setBookingSignal(conversationId: string, signal: string | null) {
      return fetchJson<{ conversation: unknown }>(
        `/conversations/${conversationId}/booking`,
        { method: 'POST', body: { signal } },
      );
    },

    /* ---- Sent History & Dead Letters ---- */

    loadSentHistory() {
      return fetchJson<SentHistoryResponse>('/sent-history');
    },

    loadDeadLetters() {
      return fetchJson<DeadLettersResponse>('/dead-letters');
    },

    /* ---- V1-style endpoints (batch state, booking, me) ---- */

    loadBatchState() {
      return fetchJson<BatchStateResponse>('/batch-state');
    },

    loadFreeSlots(tz: string) {
      return fetchJson<FreeSlotsResponse>(`/free-slots?tz=${encodeURIComponent(tz)}`);
    },

    bookSlot(convId: string, startIso: string, endIso: string, prospectEmail: string, prospectName: string, persona: string) {
      return fetchJson<BookResponse>('/book', {
        method: 'POST',
        body: { conv_id: convId, start_iso: startIso, end_iso: endIso, prospect_email: prospectEmail, prospect_name: prospectName, persona },
      });
    },

    loadMe() {
      return fetchJson<MeResponse>('/me');
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
