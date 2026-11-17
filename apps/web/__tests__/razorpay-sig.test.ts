import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { verifyWebhookSignature } from "../lib/razorpay";

const SECRET = "test_webhook_secret_32bytes_long!";

function sign(body: string): string {
  return crypto.createHmac("sha256", SECRET).update(body).digest("hex");
}

describe("verifyWebhookSignature", () => {
  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  });

  it("accepts a valid HMAC signature", () => {
    const body = '{"event":"payment.captured","payload":{}}';
    expect(verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it("rejects a tampered body", () => {
    const body = '{"event":"payment.captured","payload":{}}';
    // Tampered: different body but original signature
    expect(verifyWebhookSignature(body + " ", sign(body))).toBe(false);
  });

  it("rejects a forged signature", () => {
    const body = '{"event":"payment.captured","payload":{}}';
    const forgedSig = "a".repeat(64); // 64 hex chars but wrong
    expect(verifyWebhookSignature(body, forgedSig)).toBe(false);
  });

  it("throws when RAZORPAY_WEBHOOK_SECRET is not set", () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    expect(() => verifyWebhookSignature("body", "sig")).toThrow(
      "Missing RAZORPAY_WEBHOOK_SECRET"
    );
  });
});
