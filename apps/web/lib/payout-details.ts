/** Omitted bank fields are intentionally preserved on upsert. */
export function validatePayoutDetails(input: unknown): string | {
  upi_id: string;
  account_holder_name?: string;
  account_number?: string;
  ifsc_code?: string;
  bank_name?: string | null;
  branch?: string | null;
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) return "Invalid payout details";
  const body = input as Record<string, unknown>;
  const fields = ["upi_id", "account_holder_name", "account_number", "ifsc_code", "bank_name", "branch"];
  for (const key of fields) {
    if (body[key] != null && typeof body[key] !== "string") return "Payout fields must be text";
  }
  const value = (key: string) => typeof body[key] === "string" ? body[key].trim() : "";
  const upi_id = value("upi_id");
  if (!/^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z][a-zA-Z0-9]{1,}$/.test(upi_id)) return "Enter a valid UPI ID (name@handle)";
  const hasBank = fields.slice(1).some(key => key in body);
  if (!hasBank) return { upi_id };
  const account_holder_name = value("account_holder_name");
  const account_number = value("account_number").replace(/\s+/g, "");
  const ifsc_code = value("ifsc_code").toUpperCase();
  if (!account_holder_name) return "Account holder name is required when adding bank details";
  if (!/^\d{6,20}$/.test(account_number)) return "Account number must be 6-20 digits";
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc_code)) return "IFSC code format is invalid";
  return { upi_id, account_holder_name, account_number, ifsc_code, bank_name: value("bank_name") || null, branch: value("branch") || null };
}
