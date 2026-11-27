-- Allow vendors to independently toggle online (Cashfree UPI) payments.
-- Default true: existing shops keep online payments active without any action.
ALTER TABLE shops ADD COLUMN IF NOT EXISTS online_payments_enabled BOOLEAN DEFAULT true;
