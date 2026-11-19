import crypto from "crypto";

// Cashfree Payment Gateway (PG API v2023-08-01) over plain fetch — no SDK needed.
const API_VERSION = "2023-08-01";

export type RefundStatus = "pending" | "processed" | "failed";

export function isCashfreeProduction() {
  return process.env.CASHFREE_ENV === "production";
}

function baseUrl() {
  return isCashfreeProduction() ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
}

function credentials() {
  const appId = process.env.CASHFREE_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secret) throw new Error("Missing CASHFREE_APP_ID or CASHFREE_SECRET_KEY");
  return { appId, secret };
}

async function cashfree<T>(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<T> {
  const { appId, secret } = credentials();
  const res = await fetch(`${baseUrl()}${path}`, {
    method: init.method,
    headers: {
      "Content-Type": "application/json",
      "x-api-version": API_VERSION,
      "x-client-id": appId,
      "x-client-secret": secret,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { message?: string }).message ?? res.statusText;
    throw new Error(`Cashfree ${init.method} ${path} failed (${res.status}): ${message}`);
  }
  return data as T;
}

const rupees = (paise: number) => Number((paise / 100).toFixed(2));

/** Creates a Cashfree order for a print job. Returns our order id + the checkout session id. */
export async function createOrder(jobId: string, amountPaise: number, customerPhone?: string | null) {
  const compactId = jobId.replace(/-/g, "");
  // Suffix keeps order_id unique if a job ever needs a second order (max 50 chars).
  const orderId = `job_${compactId}_${Date.now().toString(36)}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const order = await cashfree<{ order_id: string; payment_session_id: string }>("/orders", {
    method: "POST",
    body: {
      order_id: orderId,
      order_amount: rupees(amountPaise),
      order_currency: "INR",
      customer_details: {
        customer_id: `cust_${compactId}`,
        // shortcut: Cashfree requires a phone and we don't collect one yet; pass the real number once the PWA asks for it.
        customer_phone: customerPhone && /^\d{10}$/.test(customerPhone) ? customerPhone : "9999999999",
      },
      order_meta: appUrl?.startsWith("https://")
        ? { notify_url: `${appUrl}/api/webhooks/cashfree` }
        : undefined,
      order_tags: { job_id: jobId },
    },
  });
  return { orderId: order.order_id, paymentSessionId: order.payment_session_id };
}

/** Maps Cashfree refund states onto the statuses already stored in payments.refund_status. */
export function mapRefundStatus(status: string | undefined): RefundStatus {
  if (status === "SUCCESS") return "processed";
  if (status === "CANCELLED") return "failed";
  return "pending"; // PENDING, ONHOLD
}

/** Refunds a paid order. refund_id = jobId, so a retry for the same job is rejected by Cashfree instead of refunding twice. */
export async function createRefund(orderId: string, amountPaise: number, jobId: string) {
  const refund = await cashfree<{ refund_id: string; refund_status: string }>(
    `/orders/${encodeURIComponent(orderId)}/refunds`,
    {
      method: "POST",
      body: { refund_amount: rupees(amountPaise), refund_id: jobId, refund_note: "Print failed", refund_speed: "STANDARD" },
    }
  );
  return { id: refund.refund_id, status: mapRefundStatus(refund.refund_status) };
}

/** Returns the refund for this order/refund id, or null if Cashfree has none. */
export async function fetchRefund(orderId: string, refundId: string) {
  try {
    const refund = await cashfree<{ refund_id: string; refund_status: string }>(
      `/orders/${encodeURIComponent(orderId)}/refunds/${encodeURIComponent(refundId)}`,
      { method: "GET" }
    );
    return { id: refund.refund_id, status: mapRefundStatus(refund.refund_status) };
  } catch (error) {
    if (error instanceof Error && error.message.includes("(404)")) return null;
    throw error;
  }
}

/** Cashfree signs webhooks as base64(HMAC-SHA256(timestamp + rawBody, secret key)). */
export function verifyWebhookSignature(rawBody: string, signature: string, timestamp: string): boolean {
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!secret) throw new Error("Missing CASHFREE_SECRET_KEY");
  const expected = Buffer.from(crypto.createHmac("sha256", secret).update(timestamp + rawBody).digest("base64"));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
