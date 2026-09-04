// Real-time events broadcast from a customer's mobile session to the
// matching /kiosk/[shopId] screen. Uses Supabase Realtime's broadcast
// channel (WebSockets underneath) — transient, not persisted, doesn't
// touch Postgres.
//
// The kiosk merges these events with DB status changes (postgres_changes
// on print_jobs) to show a single continuous timeline:
//   upload:start -> upload:progress -> upload:done ->
//   checkout:opened -> (payment webhook -> DB status change) ->
//   printing -> awaiting_release
//
// Each event carries a `sessionId` so a kiosk with multiple simultaneous
// customers can distinguish them. The kiosk always shows the newest
// session in the hero slot.

export interface UploadStartEvent {
  type: "upload:start";
  sessionId: string;
  fileName: string;
  fileCount: number;
  sentAt: string;
}

export interface UploadProgressEvent {
  type: "upload:progress";
  sessionId: string;
  percent: number;
  sentAt: string;
}

export interface UploadDoneEvent {
  type: "upload:done";
  sessionId: string;
  fileName: string;
  pageCount: number;
  sentAt: string;
}

export interface CheckoutOpenedEvent {
  type: "checkout:opened";
  sessionId: string;
  amountPaise: number;
  fileName: string;
  sentAt: string;
}

export interface CheckoutDismissedEvent {
  type: "checkout:dismissed";
  sessionId: string;
  sentAt: string;
}

// Server-side events (broadcast from webhook / virtual-print ticker using
// the service-role client). No sessionId — these are keyed by jobId.
export interface PaymentSuccessEvent {
  type: "payment:success";
  jobId: string;
  amountPaise: number;
  fileName?: string;
  sentAt: string;
}

export interface PaymentFailedEvent {
  type: "payment:failed";
  jobId: string;
  reason?: string;
  sentAt: string;
}

export interface PrintStartedEvent {
  type: "print:started";
  jobId: string;
  fileName?: string;
  sentAt: string;
}

export interface PrintCompletedEvent {
  type: "print:completed";
  jobId: string;
  fileName?: string;
  sentAt: string;
}

export interface PrintFailedEvent {
  type: "print:failed";
  jobId: string;
  reason?: string;
  sentAt: string;
}

export type KioskEvent =
  | UploadStartEvent
  | UploadProgressEvent
  | UploadDoneEvent
  | CheckoutOpenedEvent
  | CheckoutDismissedEvent
  | PaymentSuccessEvent
  | PaymentFailedEvent
  | PrintStartedEvent
  | PrintCompletedEvent
  | PrintFailedEvent;

export const KIOSK_BROADCAST_EVENT = "kiosk-live" as const;

export function kioskChannelName(shopId: string): string {
  return `kiosk:${shopId}`;
}

// Random-ish session id — good enough for distinguishing concurrent
// customers on one kiosk within a few minutes.
export function newSessionId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `s_${Date.now().toString(36)}_${rand}`;
}
