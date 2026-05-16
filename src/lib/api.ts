import type {
  BatchStateResponse,
  BookResponse,
  Conversation,
  ConversationDetailResponse,
  DeadLetterRetryResponse,
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
  function normalizeConversation(item: Record<string, unknown>): Conversation {
    const id = String(item.id ?? item.conv_id ?? '');
    const draftId = item.draft_id as number | undefined;
    const body = (item.body as string | undefined) ?? '';
    const intent = (item.intent as string | undefined) ?? '';
    const attachments = item.attachments;
    return {
      ...item,
      id,
      client: String(item.client ?? ''),
      prospect_email: item.prospect_email ?? item.email ?? '',
      subject: item.subject ?? null,
      state: String(item.state ?? ''),
      last_state_at: (item.last_state_at as number | null | undefined) ?? null,
      last_inbound_at: item.last_inbound_at ?? null,
      last_outbound_at: item.last_outbound_at ?? null,
      last_inbound_text: (item.last_inbound_text as string | null | undefined) ?? null,
      needs_josh_reason: (item.needs_josh_reason as string | null | undefined) ?? null,
      needs_josh_reason_label: (item.needs_josh_reason_label as string | null | undefined) ?? null,
      current_draft: item.current_draft ?? (draftId
        ? {
            id: draftId,
            conversation_id: id,
            intent,
            plan_json: {},
            rendered_body: body,
            rendered_html: null,
            attachments: Array.isArray(attachments) ? attachments : [],
            missive_draft_id: item.missive_draft_id ?? null,
            missive_draft_url: null,
            sent: false,
            sent_at: null,
            sent_by: null,
            reviewed_by: null,
          }
        : null),
      notes: item.notes ?? '',
      notes_version: item.notes_version ?? 0,
      followup_cadence: item.followup_cadence ?? null,
      missive_link_status: item.missive_link_status ?? null,
      missive_link_label: item.missive_link_label ?? null,
      missive_link_reason: item.missive_link_reason ?? null,
      attention_kind: item.attention_kind ?? null,
      attention_reason: item.attention_reason ?? null,
      booking_signal: (item.booking_signal as Conversation['booking_signal']) ?? null,
      booking_signal_at: (item.booking_signal_at as number | null | undefined) ?? null,
      snoozed_until: (item.snoozed_until as number | null | undefined) ?? null,
      assigned_to: (item.assigned_to as number | null | undefined) ?? null,
      assigned_at: (item.assigned_at as number | null | undefined) ?? null,
      missive_url: (item.missive_url as string | null | undefined) ?? null,
    } as Conversation;
  }

  function normalizeQueue(payload: unknown): QueueResponse {
    const raw = payload as Record<string, unknown>;
    if (raw.groups && typeof raw.groups === 'object') {
      const groups = raw.groups as Record<string, unknown[]>;
      return {
        ...raw,
        groups: Object.fromEntries(
          Object.entries(groups).map(([key, items]) => [
            key,
            (items || []).map((item) => normalizeConversation(item as Record<string, unknown>)),
          ]),
        ),
      } as QueueResponse;
    }
    return {
      groups: {
        drafted: ((raw.replies as unknown[]) || []).map((item) => normalizeConversation(item as Record<string, unknown>)),
        nudge_due: ((raw.nudges as unknown[]) || []).map((item) => normalizeConversation(item as Record<string, unknown>)),
        needs_josh: ((raw.needs_josh as unknown[]) || []).map((item) => normalizeConversation(item as Record<string, unknown>)),
        snoozed: ((raw.snoozed as unknown[]) || []).map((item) => normalizeConversation(item as Record<string, unknown>)),
      },
      states: ['drafted', 'nudge_due', 'needs_josh', 'snoozed'],
      limit: 0,
      offset: 0,
    };
  }

  function normalizeSentHistory(payload: unknown): SentHistoryResponse {
    const raw = payload as Record<string, unknown>;
    return { drafts: ((raw.drafts ?? raw.items ?? []) as SentHistoryResponse['drafts']) };
  }

  function normalizeDeadLetters(payload: unknown): DeadLettersResponse {
    const raw = payload as Record<string, unknown>;
    return {
      dead_letters: ((raw.dead_letters ?? raw.entries ?? []) as DeadLettersResponse['dead_letters']),
      limit: Number(raw.limit ?? 0),
      offset: Number(raw.offset ?? 0),
    };
  }

  async function fetchJson<T>(
    path: string,
    options: { method?: string; body?: Record<string, unknown> } = {},
  ): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-Review-Token': apiKey,
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

  async function fetchFirst<T>(
    requests: Array<{ path: string; method?: string; body?: Record<string, unknown> }>,
  ): Promise<T> {
    let lastErr: unknown;
    for (const request of requests) {
      try {
        return await fetchJson<T>(request.path, {
          method: request.method,
          body: request.body,
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          lastErr = err;
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  return {
    /* ---- Queue & Conversations ---- */

    loadQueue(state?: string) {
      const params = new URLSearchParams();
      if (state) params.append('state', state);
      return fetchJson<unknown>(`/queue?${params.toString()}`).then(normalizeQueue);
    },

    loadConversation(conversationId: string) {
      return fetchJson<ConversationDetailResponse>(
        `/conversations/${conversationId}`,
      );
    },

    /* ---- Drafts ---- */

    saveDraft(draftId: number, renderedBody: string) {
      return fetchFirst<{ draft: unknown } | { ok: boolean }>([
        { path: `/drafts/${draftId}`, method: 'PATCH', body: { rendered_body: renderedBody } },
        { path: '/edit-draft', method: 'POST', body: { draft_id: draftId, body: renderedBody } },
      ]);
    },

    approveDraft(draftId: number) {
      return fetchJson<{
        conversation_id: string;
        missive_draft_id: string;
        state: string;
      }>(`/drafts/${draftId}/approve`, { method: 'POST', body: {} });
    },

    sendDraft(draftId: number, body?: string) {
      return fetchFirst<{
        conversation_id: string;
        duplicate: boolean;
        state: string;
        edited?: boolean;
        edit_distance?: number;
      }>([
        { path: `/drafts/${draftId}/send`, method: 'POST', body: { sent_by: 'Review UI', ...(body ? { body } : {}) } },
        { path: '/send', method: 'POST', body: { draft_id: draftId, ...(body ? { body } : {}) } },
      ]);
    },

    /* ---- Notes ---- */

    saveNotes(
      conversationId: string,
      notes: string,
      expectedVersion: number,
    ) {
      return fetchFirst<{ conversation: unknown } | { ok: boolean }>([
        { path: `/conversations/${conversationId}/notes`, method: 'POST', body: { notes, expected_version: expectedVersion } },
        { path: '/note', method: 'POST', body: { conv_id: conversationId, notes, client_version: expectedVersion + 1 } },
      ]);
    },

    /* ---- Actions ---- */

    regenerateDraft(conversationId: string) {
      return fetchFirst<{ conversation_id: string; job_id: number | null } | { ok: boolean }>([
        { path: `/conversations/${conversationId}/regen`, method: 'POST', body: { reason: 'review_ui_regen' } },
        { path: '/regen', method: 'POST', body: { conv_id: conversationId } },
      ]);
    },

    archiveConversation(conversationId: string) {
      return fetchFirst<{ conversation_id: string; state: string } | { ok: boolean }>([
        { path: `/conversations/${conversationId}/archive`, method: 'POST', body: { reason: 'review_ui_archive' } },
        { path: '/archive', method: 'POST', body: { conv_id: conversationId, reason: 'review_ui_archive' } },
      ]);
    },

    syncConversation(conversationId: string) {
      return fetchJson<{ conversation_id: string; job_id: number }>(
        `/conversations/${conversationId}/sync`,
        { method: 'POST', body: {} },
      );
    },

    assignConversation(conversationId: string, assignedTo: number | null) {
      return fetchFirst<{ conversation: unknown } | { ok: boolean }>([
        { path: `/conversations/${conversationId}/assign`, method: 'POST', body: { assigned_to: assignedTo } },
        { path: '/assign', method: 'POST', body: { conv_id: conversationId, user_id: assignedTo } },
      ]);
    },

    setBookingSignal(conversationId: string, signal: string | null) {
      return fetchJson<{ conversation: unknown }>(
        `/conversations/${conversationId}/booking`,
        { method: 'POST', body: { signal } },
      );
    },

    /* ---- Sent History & Dead Letters ---- */

    loadSentHistory() {
      return fetchJson<unknown>('/sent-history').then(normalizeSentHistory);
    },

    loadDeadLetters() {
      return fetchJson<unknown>('/dead-letters').then(normalizeDeadLetters);
    },

    retryDeadLetter(deadLetterId: number) {
      return fetchJson<DeadLetterRetryResponse>(
        `/dead-letters/${deadLetterId}/retry`,
        { method: 'POST', body: {} },
      );
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
