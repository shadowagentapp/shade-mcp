import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeAll, describe, expect, it } from "vitest";
import { STATUS, createServer } from "../src/server.js";

const fixture = (name: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", `${name}.json`), "utf8")) as Record<string, unknown>;

let client: Client;

beforeAll(async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer().connect(a);
  client = new Client({ name: "test", version: "0" });
  await client.connect(b);
});

async function call(name: string, args: Record<string, unknown> = {}) {
  const r = (await client.callTool({ name, arguments: args })) as { content: { text: string }[]; isError?: boolean };
  const text = r.content[0]?.text ?? "";
  return { isError: r.isError === true, text, data: r.isError ? undefined : JSON.parse(text) };
}

describe("shade-mcp", () => {
  it("lists exactly the four tools, all read-only", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "build_disclosure_request",
      "check_presentation",
      "validate_document",
      "verifier_status",
    ]);
    for (const t of tools) expect(t.annotations?.readOnlyHint).toBe(true);
  });

  it("verifier_status says registry and proofs are not available", async () => {
    const r = await call("verifier_status");
    expect(r.data).toEqual(STATUS);
    expect(r.data.bestPossibleVerdict).toBe("incomplete");
    expect(r.data.registry).toMatch(/^not available/);
    expect(r.data.proofVerification).toMatch(/^not available/);
  });

  it("build_disclosure_request returns a valid request with a fresh nonce", async () => {
    const r = await call("build_disclosure_request", {
      audience: "venue",
      requirements: [{ kind: "passport-active" }, { kind: "tier", min: "basic" }],
      ttlSeconds: 120,
    });
    expect(r.isError).toBe(false);
    expect(r.data.nonce).toMatch(/^0x[0-9a-f]{64}$/);
    const check = await call("validate_document", { type: "request", document: r.data });
    expect(check.data.valid).toBe(true);
  });

  it("build_disclosure_request rejects an unknown statement", async () => {
    const r = await call("build_disclosure_request", { audience: "venue", requirements: [{ kind: "net-worth" }] });
    expect(r.isError).toBe(true);
  });

  it("validate_document reports field errors", async () => {
    const ok = await call("validate_document", { type: "passport", document: fixture("passport.basic") });
    expect(ok.data).toEqual({ valid: true, errors: [] });
    const bad = await call("validate_document", {
      type: "passport",
      document: { ...fixture("passport.basic"), owner: "0xdead" },
    });
    expect(bad.data.valid).toBe(false);
    expect(bad.data.errors.length).toBeGreaterThan(0);
  });

  it("check_presentation never accepts, and rejects the example-only proof", async () => {
    const request = fixture("request.venue");
    const envelope = fixture("proof.venue");
    // The fixtures are dated 2026-01-01, so they are expired by now: freshness fails first.
    const expired = await call("check_presentation", { request, envelope });
    expect(expired.data.verdict).toBe("rejected");

    const future = new Date(Date.now() + 60_000).toISOString();
    const fresh = await call("check_presentation", {
      request: { ...request, issuedAt: new Date().toISOString(), expiresAt: future },
      envelope: { ...envelope, issuedAt: new Date().toISOString(), expiresAt: future },
    });
    expect(fresh.data.verdict).toBe("rejected");
    const byId = Object.fromEntries(
      (fresh.data.checks as { id: string; status: string }[]).map((c) => [c.id, c.status]),
    );
    expect(byId).toMatchObject({ coverage: "pass", registry: "skipped", proof: "fail" });

    const other = await call("check_presentation", {
      request: { ...request, expiresAt: future },
      envelope: { ...envelope, expiresAt: future, proof: { system: "future-system", data: "" } },
    });
    expect(other.data.verdict).toBe("incomplete");
  });
});
