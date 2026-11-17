import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Hoisted so the mock factory can capture them before the module is loaded.
const { mockSelectSingle, mockUpdateEq } = vi.hoisted(() => ({
  mockSelectSingle: vi.fn(),
  mockUpdateEq: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: mockSelectSingle }) }),
      update: () => ({ eq: mockUpdateEq }),
    }),
  }),
}));

import { POST } from "../app/api/jobs/[id]/release/route";

function makeReq(body: Record<string, unknown> = {}): NextRequest {
  return new Request("http://localhost/api/jobs/test-id/release", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const params = Promise.resolve({ id: "test-job-id" });

describe("POST /api/jobs/[id]/release", () => {
  beforeEach(() => {
    mockSelectSingle.mockReset();
    mockUpdateEq.mockReset();
    mockUpdateEq.mockResolvedValue({ error: null });
  });

  it("returns 404 when job is not found", async () => {
    mockSelectSingle.mockResolvedValue({ data: null, error: { message: "not found" } });
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(404);
  });

  it("returns 400 when job is in a non-releasable status", async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id: "test-job-id", status: "printing", release_code: null },
      error: null,
    });
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/printing/);
  });

  it("returns 400 when release code does not match", async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id: "test-job-id", status: "awaiting_release", release_code: "1234" },
      error: null,
    });
    const res = await POST(makeReq({ code: "9999" }), { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid release code/i);
  });

  it("returns 200 when release code matches", async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id: "test-job-id", status: "awaiting_release", release_code: "1234" },
      error: null,
    });
    const res = await POST(makeReq({ code: "1234" }), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns 200 for dispatched job with no release code required", async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id: "test-job-id", status: "dispatched", release_code: null },
      error: null,
    });
    // No code sent, no code on job → skip check
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(200);
  });

  it("trims whitespace when comparing codes", async () => {
    mockSelectSingle.mockResolvedValue({
      data: { id: "test-job-id", status: "awaiting_release", release_code: " 1234 " },
      error: null,
    });
    const res = await POST(makeReq({ code: "1234" }), { params });
    expect(res.status).toBe(200);
  });
});
