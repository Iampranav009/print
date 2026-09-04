"use client";

import { useState, useEffect, useCallback } from "react";
import type { JobStatus, PrinterCapabilities, CapabilitiesSource } from "@printbuddy/shared";

const PILOT_SHOP_ID = "00000000-0000-0000-0000-000000000001";
const IS_TEST_MODE =
  typeof window !== "undefined" &&
  (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").startsWith("rzp_test_");

interface PricingData {
  bw_page_paise: number;
  color_page_paise: number;
  a3_multiplier: number;
  duplex_factor: number;
  min_charge_paise: number;
  media_type_surcharges: Record<string, number>;
}

interface QueueJob {
  id: string;
  status: JobStatus;
  pages: number;
  copies: number;
  color: boolean;
  paper: string;
  price_paise: number;
  created_at: string;
}

interface AgentInfo {
  id: string;
  status: string;
  last_heartbeat: string | null;
  platform: string | null;
}

interface PrinterInfoState {
  capabilities: PrinterCapabilities | null;
  capabilities_source: CapabilitiesSource;
  make_and_model: string | null;
  capabilities_updated_at: string | null;
}

export function DashboardClient() {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printerInfo, setPrinterInfo] = useState<PrinterInfoState | null>(null);
  const [capEditing, setCapEditing] = useState(false);
  const [capDraft, setCapDraft] = useState<PrinterCapabilities | null>(null);
  const [capSaving, setCapSaving] = useState(false);
  const [simLog, setSimLog] = useState<string[]>([]);
  const [simRunning, setSimRunning] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [shopRes, queueRes, agentsRes] = await Promise.all([
        fetch(`/api/shops/${PILOT_SHOP_ID}`),
        fetch(`/api/dashboard/queue?shopId=${PILOT_SHOP_ID}`),
        fetch(`/api/dashboard/agents?shopId=${PILOT_SHOP_ID}`),
      ]);

      if (shopRes.ok) {
        const data = await shopRes.json();
        setPricing(data.pricing);
        const p = data.printers?.[0];
        if (p) {
          setPrinterInfo({
            capabilities: p.capabilities,
            capabilities_source: p.capabilities_source,
            make_and_model: p.make_and_model,
            capabilities_updated_at: p.capabilities_updated_at,
          });
        }
      }
      if (queueRes.ok) {
        const data = await queueRes.json();
        setJobs(data.jobs || []);
      }
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data.agents || []);
      }
    } catch {
      setError("Failed to load dashboard data");
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const savePricing = async () => {
    if (!pricing) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: PILOT_SHOP_ID, ...pricing }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch {
      setError("Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  const paise = (v: number) => `₹${(v / 100).toFixed(2)}`;

  const saveCapabilities = async () => {
    if (!capDraft) return;
    setCapSaving(true);
    try {
      const res = await fetch("/api/dashboard/capabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: PILOT_SHOP_ID, action: "set_manual", capabilities: capDraft }),
      });
      if (!res.ok) throw new Error("Save failed");
      setCapEditing(false);
      await fetchAll();
    } catch {
      setError("Failed to save capabilities");
    } finally {
      setCapSaving(false);
    }
  };

  const resetCapabilities = async () => {
    setCapSaving(true);
    try {
      const res = await fetch("/api/dashboard/capabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: PILOT_SHOP_ID, action: "reset" }),
      });
      if (!res.ok) throw new Error("Reset failed");
      setCapEditing(false);
      await fetchAll();
    } catch {
      setError("Failed to reset capabilities");
    } finally {
      setCapSaving(false);
    }
  };

  const sourceBadge = (source: CapabilitiesSource) => {
    const styles: Record<CapabilitiesSource, string> = {
      default: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
      discovered: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      manual: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    };
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[source]}`}>
        {source}
      </span>
    );
  };

  const simAppend = (msg: string) => {
    setSimLog((prev) => [...prev, msg]);
    const m = msg.match(/Order (order_[A-Za-z0-9]+)/);
    if (m) setLastOrderId(m[1]);
  };

  const runSimulation = async (fail?: string) => {
    if (simRunning) return;
    setSimRunning(true);
    setSimLog([]);
    try {
      simAppend(fail ? `Starting failure simulation (${fail})...` : "Starting happy-path simulation...");

      simAppend("Creating test job...");
      const jobRes = await fetch("/api/dashboard/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: PILOT_SHOP_ID, action: "create_test_job" }),
      });
      const jobData = await jobRes.json();
      if (!jobRes.ok) throw new Error(jobData.error || "Failed to create test job");
      const jobId = jobData.jobId;
      simAppend(`Job ${jobId.slice(0, 8)}... created (${jobData.pricePaise} paise)`);

      simAppend("Creating Razorpay order...");
      const payRes = await fetch(`/api/jobs/${jobId}/pay`, { method: "POST" });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error || "Pay failed");
      simAppend(`Order ${payData.orderId} created`);

      simAppend("Simulating webhook dispatch...");
      const whRes = await fetch("/api/dashboard/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: PILOT_SHOP_ID, action: "simulate_dispatch", jobId }),
      });
      if (!whRes.ok) throw new Error("Dispatch simulation failed");
      simAppend("Job dispatched");

      simAppend("Transitioning to awaiting_release...");
      await fetch("/api/dashboard/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance_status", jobId, status: "awaiting_release" }),
      });

      simAppend("Releasing job...");
      await fetch(`/api/jobs/${jobId}/release`, { method: "POST" });

      simAppend("Printing...");
      await fetch("/api/dashboard/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance_status", jobId, status: "printing" }),
      });

      if (fail) {
        simAppend(`Simulating failure: ${fail}`);
        await fetch("/api/dashboard/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "advance_status", jobId, status: "print_failed", reason: fail }),
        });
        simAppend("Print failed — refund initiated (if payment existed)");
      } else {
        simAppend("Completing print...");
        await fetch("/api/dashboard/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "advance_status", jobId, status: "printed" }),
        });
        simAppend("Job printed successfully!");
      }

      await fetchAll();
      simAppend("Done.");
    } catch (err: unknown) {
      simAppend(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSimRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Agent Status */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Printer / Agent Status</h2>
        {agents.length === 0 ? (
          <p className="text-zinc-500 text-sm">No agents registered.</p>
        ) : (
          <div className="space-y-2">
            {agents.map((a) => {
              const online =
                a.status === "online" &&
                a.last_heartbeat &&
                Date.now() - new Date(a.last_heartbeat).getTime() < 60_000;
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between border border-zinc-200 dark:border-zinc-700 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${online ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <span className="text-sm font-medium">
                      {a.platform || "Agent"}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {online
                      ? "Online"
                      : a.last_heartbeat
                        ? `Last seen ${new Date(a.last_heartbeat).toLocaleTimeString()}`
                        : "Never connected"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Printer Capabilities */}
      {printerInfo && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Printer Capabilities</h2>
            <div className="flex items-center gap-2">
              {sourceBadge(printerInfo.capabilities_source)}
              {printerInfo.capabilities_updated_at && (
                <span className="text-xs text-zinc-400">
                  {new Date(printerInfo.capabilities_updated_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {printerInfo.make_and_model && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
              {printerInfo.make_and_model}
            </p>
          )}

          {printerInfo.capabilities_source === "manual" && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Manual override is active — auto-discovery will not overwrite these values.
            </p>
          )}

          {!capEditing ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <span>Color: {printerInfo.capabilities?.color ? "yes" : "no"}</span>
                <span>Sides: {printerInfo.capabilities?.sides?.join(", ")}</span>
                <span>Media: {printerInfo.capabilities?.media?.join(", ")}</span>
                <span>N-up: {printerInfo.capabilities?.number_up?.join(", ")}</span>
                <span>Quality: {printerInfo.capabilities?.quality?.join(", ")}</span>
                <span>Finishings: {printerInfo.capabilities?.finishings?.join(", ") || "none"}</span>
                <span>Max copies: {printerInfo.capabilities?.max_copies}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setCapDraft(printerInfo.capabilities ? { ...printerInfo.capabilities } : null); setCapEditing(true); }}
                  className="text-sm px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Curate capabilities
                </button>
                {printerInfo.capabilities_source === "manual" && (
                  <button
                    onClick={resetCapabilities}
                    disabled={capSaving}
                    className="text-sm px-3 py-1.5 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Reset to auto-discovered
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
              <p className="text-xs text-zinc-500">
                Editing capabilities manually. Save sets source to <strong>manual</strong> — auto-discovery will no longer overwrite.
              </p>

              {capDraft && (
                <div className="space-y-3 text-sm">
                  {/* Boolean toggles */}
                  {(["color", "collate", "reverse"] as const).map((key) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={capDraft[key] as boolean}
                        onChange={(e) => setCapDraft((d) => d ? { ...d, [key]: e.target.checked } : d)}
                        className="w-4 h-4"
                      />
                      <span className="capitalize">{key}</span>
                    </label>
                  ))}

                  {/* Array fields */}
                  {(["sides", "media", "media_types", "quality", "scaling", "finishings"] as const).map((key) => (
                    <div key={key}>
                      <label className="text-xs text-zinc-500 mb-1 block capitalize">{key.replace(/_/g, " ")}</label>
                      <input
                        type="text"
                        value={(capDraft[key] as string[]).join(", ")}
                        onChange={(e) =>
                          setCapDraft((d) =>
                            d ? { ...d, [key]: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : d
                          )
                        }
                        className="w-full border border-zinc-300 dark:border-zinc-600 rounded-lg px-2 py-1.5 text-sm bg-transparent"
                        placeholder="comma-separated values"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Number-up</label>
                    <input
                      type="text"
                      value={capDraft.number_up.join(", ")}
                      onChange={(e) =>
                        setCapDraft((d) =>
                          d ? { ...d, number_up: e.target.value.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)) } : d
                        )
                      }
                      className="w-full border border-zinc-300 dark:border-zinc-600 rounded-lg px-2 py-1.5 text-sm bg-transparent"
                      placeholder="1, 2, 4"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Max copies</label>
                    <input
                      type="number"
                      value={capDraft.max_copies}
                      onChange={(e) => setCapDraft((d) => d ? { ...d, max_copies: parseInt(e.target.value, 10) || 1 } : d)}
                      className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-2 py-1.5 text-sm bg-transparent w-24"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveCapabilities}
                  disabled={capSaving}
                  className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  {capSaving ? "Saving..." : "Save as manual"}
                </button>
                <button
                  onClick={() => setCapEditing(false)}
                  className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Pricing Editor */}
      {pricing && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Pricing</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "B&W per page", key: "bw_page_paise" as const },
              { label: "Color per page", key: "color_page_paise" as const },
              { label: "Min charge", key: "min_charge_paise" as const },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-sm text-zinc-500">{label}</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-zinc-400">₹</span>
                  <input
                    type="number"
                    step="0.5"
                    value={(pricing[key] / 100).toFixed(2)}
                    onChange={(e) =>
                      setPricing((p) =>
                        p
                          ? { ...p, [key]: Math.round(parseFloat(e.target.value) * 100) }
                          : p
                      )
                    }
                    className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-2 py-1.5 text-sm bg-transparent w-24"
                  />
                </div>
              </div>
            ))}
            <div>
              <label className="text-sm text-zinc-500">A3 multiplier</label>
              <input
                type="number"
                step="0.1"
                value={pricing.a3_multiplier}
                onChange={(e) =>
                  setPricing((p) =>
                    p ? { ...p, a3_multiplier: parseFloat(e.target.value) || 1 } : p
                  )
                }
                className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-2 py-1.5 text-sm bg-transparent w-24"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-500">Duplex factor</label>
              <input
                type="number"
                step="0.1"
                value={pricing.duplex_factor}
                onChange={(e) =>
                  setPricing((p) =>
                    p ? { ...p, duplex_factor: parseFloat(e.target.value) || 1 } : p
                  )
                }
                className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-2 py-1.5 text-sm bg-transparent w-24"
              />
            </div>
          </div>
          {pricing.media_type_surcharges && (
            <div>
              <p className="text-sm text-zinc-500 mb-2">Media type surcharges</p>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(pricing.media_type_surcharges).map(([type, paise]) => (
                  <div key={type}>
                    <label className="text-xs text-zinc-400 capitalize">{type}</label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-zinc-400">₹</span>
                      <input
                        type="number"
                        step="0.5"
                        value={(paise / 100).toFixed(2)}
                        onChange={(e) =>
                          setPricing((p) =>
                            p
                              ? {
                                  ...p,
                                  media_type_surcharges: {
                                    ...p.media_type_surcharges,
                                    [type]: Math.round(parseFloat(e.target.value) * 100) || 0,
                                  },
                                }
                              : p
                          )
                        }
                        className="border border-zinc-300 dark:border-zinc-600 rounded-lg px-2 py-1.5 text-sm bg-transparent w-24"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={savePricing}
            disabled={saving}
            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Pricing"}
          </button>
        </section>
      )}

      {/* Dev Simulate Controls */}
      {IS_TEST_MODE && (
        <section className="space-y-3 border border-amber-300 dark:border-amber-700 rounded-lg p-4 bg-amber-50 dark:bg-amber-950">
          <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
            Dev: Simulate
          </h2>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Test-mode controls — walk a job through the full chain without a printer.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setLastOrderId(null); runSimulation(); }}
              disabled={simRunning}
              className="bg-green-600 text-white font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {simRunning ? "Running…" : "Happy Path"}
            </button>
            <button
              onClick={() => { setLastOrderId(null); runSimulation("paper_jam"); }}
              disabled={simRunning}
              className="bg-red-600 text-white font-medium px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              Failure + Refund
            </button>
            {simLog.length > 0 && (
              <button
                onClick={() => { setSimLog([]); setLastOrderId(null); }}
                disabled={simRunning}
                className="px-4 py-2 border border-amber-400 dark:border-amber-600 rounded-lg text-sm text-amber-800 dark:text-amber-200 disabled:opacity-50"
              >
                Clear log
              </button>
            )}
          </div>

          {simLog.length > 0 && (
            <pre className="bg-zinc-900 text-green-400 p-3 rounded-lg text-xs max-h-48 overflow-y-auto whitespace-pre-wrap">
              {simLog.join("\n")}
            </pre>
          )}

          {lastOrderId && (
            <div className="border border-amber-400 dark:border-amber-600 rounded-lg p-3 space-y-2 text-xs text-amber-800 dark:text-amber-200">
              <p className="font-semibold">Webhook helper</p>
              <p>
                Open order: <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded select-all">{lastOrderId}</code>
              </p>
              <p>
                To advance a job without using the script, fire a test webhook from the{" "}
                <a
                  href="https://dashboard.razorpay.com/app/webhooks"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Razorpay Test Dashboard
                </a>
                {" "}(Webhooks → Test → order.paid), or run:
              </p>
              <pre className="bg-zinc-900 text-green-400 p-2 rounded text-xs overflow-x-auto whitespace-pre">
{`# In a terminal (replace values from .env.local):
ORDER_ID="${lastOrderId}"
SECRET="$RAZORPAY_WEBHOOK_SECRET"
PAYLOAD=$(printf '{"event":"order.paid","payload":{"payment":{"entity":{"id":"pay_sim_test","order_id":"%s","status":"captured","amount":500,"currency":"INR","method":"upi"}}}}' "$ORDER_ID")
SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
curl -s -X POST http://localhost:3000/api/webhooks/razorpay \\
  -H "Content-Type: application/json" \\
  -H "x-razorpay-signature: $SIG" \\
  -d "$PAYLOAD"`}
              </pre>
              <p className="text-amber-600 dark:text-amber-400">
                ⚠ Without a tunnel, the webhook above fires locally only — real Razorpay test payments still need{" "}
                <code>ngrok</code> or <code>cloudflared</code>. See{" "}
                <code>docs/testing-without-hardware.md</code>.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Job Queue */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Print Queue</h2>
        {jobs.length === 0 ? (
          <p className="text-zinc-500 text-sm">No jobs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500 border-b border-zinc-200 dark:border-zinc-700">
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Pages</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr
                    key={j.id}
                    className="border-b border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          j.status === "printed"
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : j.status === "print_failed" || j.status === "payment_failed"
                              ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {j.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {j.pages} &times; {j.copies}
                    </td>
                    <td className="py-2 pr-3">
                      {j.color ? "Color" : "B&W"} {j.paper}
                    </td>
                    <td className="py-2 pr-3">{paise(j.price_paise)}</td>
                    <td className="py-2 text-zinc-500">
                      {new Date(j.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
