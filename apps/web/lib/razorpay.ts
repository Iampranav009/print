import Razorpay from "razorpay";
import crypto from "crypto";

let _client: InstanceType<typeof Razorpay> | null = null;

export function getRazorpay() {
  if (_client) return _client;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
  }
  _client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return _client;
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("Missing RAZORPAY_WEBHOOK_SECRET");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

export async function createRefund(paymentId: string, amountPaise: number) {
  return getRazorpay().payments.refund(paymentId, {
    amount: amountPaise,
    speed: "normal",
  });
}
