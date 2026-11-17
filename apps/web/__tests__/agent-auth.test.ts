import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSingle = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSingle,
        }),
      }),
    }),
  }),
}));

import { resolveAgentToken } from "../lib/agent-auth";

describe("resolveAgentToken", () => {
  beforeEach(() => mockSingle.mockReset());

  it("returns null for null header", async () => {
    expect(await resolveAgentToken(null)).toBeNull();
  });

  it("returns null for missing Bearer prefix", async () => {
    expect(await resolveAgentToken("Basic abc123")).toBeNull();
  });

  it("returns null for empty token after Bearer", async () => {
    expect(await resolveAgentToken("Bearer ")).toBeNull();
  });

  it("returns null when DB returns no row", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });
    expect(await resolveAgentToken("Bearer unknowntoken")).toBeNull();
  });

  it("returns shopId and agentId for a valid token", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "agent-1", shop_id: "shop-1" },
      error: null,
    });
    expect(await resolveAgentToken("Bearer validtoken")).toEqual({
      shopId: "shop-1",
      agentId: "agent-1",
    });
  });
});
