import { describe, it, expect, vi, beforeEach } from "vitest";

const { state, refundFailedJob, broadcastToKiosk } = vi.hoisted(() => ({
  state: { stale: [] as { id: string; status: string; shop_id: string }[], failedRow: null as unknown },
  refundFailedJob: vi.fn(),
  broadcastToKiosk: vi.fn(),
}));

// Chainable stand-in for the Supabase query builder: records calls, resolves when awaited.
function query(table: string) {
  const ops: string[] = [];
  const result = () => {
    if (table === "payments") return { data: null, error: null };
    if (ops.includes("update") && ops.includes("maybeSingle")) return { data: state.failedRow, error: null };
    if (ops.includes("update")) return { data: [], error: null }; // unpaid expiry: nothing to expire
    return { data: state.stale, error: null };
  };
  const proxy: object = new Proxy({}, {
    get(_, prop) {
      if (prop === "then") return (ok: (v: unknown) => void, fail: (e: unknown) => void) => Promise.resolve(result()).then(ok, fail);
      return () => { ops.push(String(prop)); return proxy; };
    },
  });
  return proxy;
}

vi.mock("@/lib/supabase", () => ({ getSupabase: () => ({ from: query }) }));
vi.mock("@/lib/refunds", () => ({ refundFailedJob }));
vi.mock("@/lib/kiosk-broadcast", () => ({ broadcastToKiosk }));

import { expireStaleJobs } from "../lib/retention";

describe("expireStaleJobs", () => {
  beforeEach(() => {
    refundFailedJob.mockReset();
    broadcastToKiosk.mockReset();
    state.stale = [{ id: "job-1", status: "dispatched", shop_id: "shop-1" }];
  });

  it("fails and refunds a paid job that never printed", async () => {
    state.failedRow = { id: "job-1", razorpay_order_id: "order-1", price_paise: 300 };
    const result = await expireStaleJobs();
    expect(result.failed).toBe(1);
    expect(refundFailedJob).toHaveBeenCalledOnce();
    expect(refundFailedJob).toHaveBeenCalledWith(state.failedRow);
    expect(broadcastToKiosk).toHaveBeenCalledWith("shop-1", expect.objectContaining({ type: "print:failed", jobId: "job-1" }));
  });

  it("does not refund when the printer claimed the job first", async () => {
    state.failedRow = null; // conditional update matched nothing
    const result = await expireStaleJobs();
    expect(result.failed).toBe(0);
    expect(refundFailedJob).not.toHaveBeenCalled();
    expect(broadcastToKiosk).not.toHaveBeenCalled();
  });
});
