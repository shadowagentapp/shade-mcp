// Start the server over stdio and call its tools like an MCP client would. Run after `pnpm build`: `pnpm example`.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "shade-mcp-example", version: "0" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: ["dist/index.js"] }));

const call = async (name, args = {}) => {
  const r = await client.callTool({ name, arguments: args });
  const text = r.content[0]?.text ?? "";
  if (r.isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text);
};

const { tools } = await client.listTools();
console.log("tools:", tools.map((t) => t.name).join(", "));

const status = await call("verifier_status");
console.log("best possible verdict today:", status.bestPossibleVerdict);

const request = await call("build_disclosure_request", {
  audience: "example-venue",
  requirements: [{ kind: "passport-active" }, { kind: "tier", min: "basic" }],
});
console.log("request nonce:", request.nonce);

// EXAMPLE DATA ONLY: a hand-written envelope with the reserved `example-only` proof system. The server never accepts
// example proofs, so this comes back `rejected` at the proof step after the structural steps pass.
const result = await call("check_presentation", {
  request,
  envelope: {
    version: "shade-proof/0",
    passportId: "0x" + "11".repeat(32),
    audience: request.audience,
    nonce: request.nonce,
    keyEpoch: 0,
    issuedAt: request.issuedAt,
    expiresAt: request.expiresAt,
    claims: [{ kind: "passport-active" }, { kind: "tier", min: "high-assurance" }],
    proof: { system: "example-only", data: "ZXhhbXBsZS1vbmx5" },
  },
});
console.log("verdict:", result.verdict);
for (const c of result.checks) console.log(`  ${c.id.padEnd(9)} ${c.status.padEnd(7)} ${c.detail}`);

await client.close();
