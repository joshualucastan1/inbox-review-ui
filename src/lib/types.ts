export interface Conversation {
  id: string;
  client: string;
  prospect_email: string;
  subject: string | null;
  state: string;
  last_state_at: number | null;
  last_inbound_at: number | null;
  last_outbound_at: number | null;
  last_inbound_text: string | null;
  needs_josh_reason: string | null;
  needs_josh_reason_label: string | null;
  notes: string;
  notes_version: number;
  booking_signal: string | null;
  booking_signal_at: number | null;
  assigned_to: number | null;
  assigned_at: number | null;
  missive_url: string | null;
  missive_link_status: string | null;
  missive_link_label: string | null;
  missive_link_reason: string | null;
  attention_kind: string | null;
  attention_reason: string | null;
  followup_cadence: FollowupCadence | null;
  current_draft: Draft | null;
}

export interface Draft {
  id: number;
  conversation_id: string;
  intent: string;
  plan_json: Record<string, unknown>;
  rendered_body: string;
  rendered_html: string | null;
  attachments: string[];
  missive_draft_id: string | null;
  missive_draft_url: string | null;
  sent: boolean;
  sent_at: number | null;
  sent_by: string | null;
  reviewed_by: string | null;
}

export interface FollowupCadence {
  id: number;
  conversation_id: string;
  stage: number;
  state: string;
  due_at: number;
  basis_state: string;
  basis_at: number;
  draft_job_id: number | null;
  created_at: number;
  updated_at: number;
}

export interface AuditEvent {
  id: number;
  event: string;
  detail: string | null;
  created_at: number;
}

export interface QueueResponse {
  groups: Record<string, Conversation[]>;
  states: string[];
  limit: number;
  offset: number;
}

export interface ConversationDetailResponse {
  conversation: Conversation;
  drafts: Draft[];
  audit: AuditEvent[];
}

export interface SentHistoryResponse {
  drafts: Draft[];
}

export type BookingSignal =
  | ''
  | 'calendar_link_clicked'
  | 'time_proposed'
  | 'meeting_booked';

export const QUEUE_ORDER = [
  'drafted',
  'nudge_due',
  'needs_josh',
  'awaiting_send',
] as const;

export const QUEUE_LABELS: Record<string, string> = {
  drafted: 'Replies',
  nudge_due: 'Follow-ups',
  needs_josh: 'Needs Josh',
  awaiting_send: 'Awaiting send',
};

export const BOOKING_SIGNALS: { value: BookingSignal; label: string }[] = [
  { value: '', label: 'No signal' },
  { value: 'calendar_link_clicked', label: 'Calendar link clicked' },
  { value: 'time_proposed', label: 'Time proposed' },
  { value: 'meeting_booked', label: 'Meeting booked' },
];
