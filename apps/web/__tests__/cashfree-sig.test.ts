import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { mapRefundStatus, verifyWebhookSignature } from "../lib/cashfree";

const SECRET = "test_cashfree_secret_key";
const TS = "1700000000000";

function sign(body: string, ts = TS): string {
  return crypto.createHmac("sha256", SECRET).update(ts + body).digest("base64");
}

describe("verifyWebhookSignature", () => {
  beforeEach(() => {
    process.env.CASHFREE_SECRET_KEY = SECRET;
  });
  afterEach(() => {
    delete process.env.CASHFREE_SECRET_KEY;
  });

  const body = '{"type":"PAYMENT_SUCCESS_WEBHOOK","data":{}}';

  it("accepts a valid signature", () => {
    expect(verifyWebhookSignature(body, sign(body), TS)).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyWebhookSignature(body + " ", sign(body), TS)).toBe(false);
  });

  it("rejects a mismatched timestamp", () => {
    expect(verifyWebhookSignature(body, sign(body), "1700000000001")).toBe(false);
  });

  it("rejects a forged or wrong-length signature", () => {
    expect(verifyWebhookSignature(body, "a".repeat(44), TS)).toBe(false);
    expect(verifyWebhookSignature(body, "short", TS)).toBe(false);
  });

  it("throws when CASHFREE_SECRET_KEY is not set", () => {
    delete process.env.CASHFREE_SECRET_KEY;
    expect(() => verifyWebhookSignature("body", "sig", TS)).toThrow("Missing CASHFREE_SECRET_KEY");
  });
});

describe("mapRefundStatus", () => {
  it("maps Cashfree states onto stored refund statuses", () => {
    expect(mapRefundStatus("SUCCESS")).toBe("processed");
    expect(mapRefundStatus("CANCELLED")).toBe("failed");
    expect(mapRefundStatus("PENDING")).toBe("pending");
    expect(mapRefundStatus("ONHOLD")).toBe("pending");
  });
});
