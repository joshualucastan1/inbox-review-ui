/* ------------------------------------------------------------------ */
/*  V1-style types aligned to the rebuild API (review_routes.py)      */
/* ------------------------------------------------------------------ */

/** Thread message within a conversation (V1-style inline preview) */
export interface ThreadMessage {
  direction: 'PROSPECT' | 'US';
  sender: string;
  address?: string;
  when_iso?: string;
  body: string;
}

/** Conversation as returned by the rebuild /api/review/queue endpoint */
export interface Conversation {
  id: string;
  client: string;
  prospect_email: string;
  prospect_name?: string;
  company?: string;
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
  snoozed_until: number | null;
  assigned_to: number | null;
  assigned_at: number | null;
  assigned_name?: string;
  missive_url: string | null;
  missive_link_status: string | null;
  missive_link_label: string | null;
  missive_link_reason: string | null;
  attention_kind: string | null;
  attention_reason: string | null;
  email?: string;
  tz?: string;
  tz_source?: string;
  persona?: string;
  priority?: number;
  nudge_stage?: number;
  followup_cadence: FollowupCadence | null;
  current_draft: Draft | null;
  thread?: ThreadMessage[];
  /** V1 compat: populated from current_draft */
  draft_id?: number;
  body?: string;
  intent?: string;
  attachments?: string | string[];
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

export interface DeadLetter {
  id: number;
  conversation_id: string | null;
  from_state: string | null;
  to_state: string;
  reason: string;
  detail: string | null;
  created_at: number;
}

/* ---- API Response shapes ---- */

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
  drafts: SentHistoryItem[];
}

/** Extended draft for sent history display with edit tracking */
export interface SentHistoryItem {
  id: number;
  conversation_id: string;
  prospect_email?: string;
  client?: string;
  intent: string;
  subject?: string;
  rendered_body: string;
  sent_body?: string;
  original_body?: string;
  edit_distance?: number;
  edited?: boolean;
  sent: boolean;
  sent_at: number | null;
  sent_by: string | null;
}

export interface DeadLettersResponse {
  dead_letters: DeadLetter[];
  limit: number;
  offset: number;
}

export interface DeadLetterRetryResponse {
  dead_letter_id: number;
  conversation_id: string;
  job_id: number | null;
}

export interface BatchRegionState {
  state: 'running' | 'completed' | 'failed' | 'never_run';
  started_at?: number;
  duration_sec?: number;
  fired?: number;
  next_fire_ts?: number;
  err_message?: string;
}

export interface BatchStateResponse {
  regions: Record<string, BatchRegionState>;
  server_now_ts: number;
}

export interface FreeSlotsResponse {
  slots: FreeSlot[];
  prospect_tz: string;
}

export interface FreeSlot {
  start_sgt: string;
  end_sgt: string;
  sgt_label: string;
  local_label: string;
  tz: string;
}

export interface BookResponse {
  ok: boolean;
  calendar_event_id?: string;
  meet_link?: string;
  event_link?: string;
  missive_draft_id?: string;
  message?: string;
  error?: string;
}

export interface MeResponse {
  id: string;
  name: string;
  role: string;
}

/* ---- Tab & UI Constants ---- */

export type TabKey =
  | 'replies'
  | 'ready_to_send'
  | 'nudges'
  | 'needs_josh'
  | 'snoozed'
  | 'dead_letters'
  | 'sent_history';

export const TAB_CONFIG: { key: TabKey; label: string; apiState?: string }[] = [
  { key: 'replies', label: 'Replies', apiState: 'drafted' },
  { key: 'ready_to_send', label: 'Ready to Send', apiState: 'awaiting_send' },
  { key: 'nudges', label: 'Follow-ups', apiState: 'nudge_due' },
  { key: 'needs_josh', label: 'Needs Josh', apiState: 'needs_josh' },
  { key: 'snoozed', label: 'Snoozed' },
  { key: 'dead_letters', label: 'Dead Letters' },
  { key: 'sent_history', label: 'Sent History' },
];

/** Map V1 tab keys to rebuild API state values */
export const TAB_TO_API_STATE: Record<string, string> = {
  replies: 'drafted',
  nudges: 'nudge_due',
  needs_josh: 'needs_josh',
};

export type BookingSignal =
  | ''
  | 'calendar_link_clicked'
  | 'time_proposed'
  | 'meeting_booked';

/* ---- SGT Batch Region Mapping (V1 feature) ---- */

export const REGION_OF_TZ: Record<string, string> = {
  SGT: 'asia', HKT: 'asia', JST: 'asia', KST: 'asia', CST: 'asia',
  ICT: 'asia', PHT: 'asia', WIB: 'asia', MYT: 'asia',
  AEST: 'asia', AEDT: 'asia', NZST: 'asia', NZDT: 'asia',
  IST: 'asia', PKT: 'asia', BDT: 'asia',
  GMT: 'eumea', BST: 'eumea', WET: 'eumea', WEST: 'eumea',
  CET: 'eumea', CEST: 'eumea', EET: 'eumea', EEST: 'eumea', MSK: 'eumea',
  GST: 'eumea', AST: 'eumea', IDT: 'eumea', TRT: 'eumea',
  WAT: 'eumea', EAT: 'eumea', SAST: 'eumea',
  BRT: 'eumea', ART: 'eumea', CLT: 'eumea', CLST: 'eumea',
  COT: 'eumea', PET: 'eumea',
  ET: 'na', EST: 'na', EDT: 'na',
  CT: 'na', CDT: 'na',
  MT: 'na', MST: 'na', MDT: 'na',
  PT: 'na', PST: 'na', PDT: 'na',
  AKT: 'na', HST: 'na',
};

export const REGION_META: Record<string, { label: string; batch: string }> = {
  asia: { label: 'Asia / Oceania', batch: '09:00 SGT' },
  eumea: { label: 'Europe + ME + Africa + RoW', batch: '16:00 SGT' },
  na: { label: 'North America', batch: '20:00 SGT' },
  none: { label: 'No timezone resolved', batch: '\u2014' },
};

export const FE_TO_SCHED_REGION: Record<string, string> = {
  asia: 'asia_oceania',
  eumea: 'eu_me_africa_row',
  na: 'north_america',
};
