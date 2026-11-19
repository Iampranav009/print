import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { name, email, shop_name, city, message } = await req.json();
  if (!name || !email || !shop_name || !city) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("waitlist")
    .insert({ name, email, shop_name, city, message: message || null });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
