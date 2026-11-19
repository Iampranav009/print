"use client";
import { useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";

export default function WaitlistForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd)),
    });
    setStatus(res.ok ? "done" : "error");
  }

  if (status === "done") {
    return (
      <div className="hm-waitlist-thanks">
        <h3>You're on the list.</h3>
        <p>We'll reach out to get your shop set up. Keep an eye on your inbox.</p>
      </div>
    );
  }

  return (
    <form className="hm-waitlist-form" onSubmit={handleSubmit}>
      <div className="hm-field-row">
        <label className="hm-field">
          <span>Your name</span>
          <input name="name" type="text" placeholder="Ravi Sharma" required />
        </label>
        <label className="hm-field">
          <span>Email address</span>
          <input name="email" type="email" placeholder="ravi@example.com" required />
        </label>
      </div>
      <div className="hm-field-row">
        <label className="hm-field">
          <span>Shop name</span>
          <input name="shop_name" type="text" placeholder="Ravi Xerox & Prints" required />
        </label>
        <label className="hm-field">
          <span>City</span>
          <input name="city" type="text" placeholder="Yavatmal" required />
        </label>
      </div>
      <label className="hm-field">
        <span>Anything else? <em>(optional)</em></span>
        <textarea name="message" rows={3} placeholder="Tell us about your shop or ask a question." />
      </label>
      {status === "error" && <p className="hm-form-error">Something went wrong. Please try again.</p>}
      <button type="submit" className="hm-button" disabled={status === "loading"}>
        {status === "loading" ? <><Loader2 size={17} className="hm-spin" /> Sending…</> : <>Join the waitlist <ArrowUpRight size={17} /></>}
      </button>
    </form>
  );
}
