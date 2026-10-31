import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  SPEC_VERSION,
  DisclosureRequest,
  Passport,
  ProofEnvelope,
  Statement,
  createDisclosureRequest,
  verifyPresentation,
} from "@shadowagentapp/sdk";
import { z } from "zod";

export const SERVER_NAME = "shade-mcp";
export const SERVER_VERSION = "0.0.1";

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const json = (value: unknown): ToolResult => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }] });
const fail = (message: string): ToolResult => ({ content: [{ type: "text", text: message }], isError: true });

async function run(fn: () => unknown | Promise<unknown>): Promise<ToolResult> {
  try {
    return json(await fn());
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

/** What this server can and cannot check today. Returned by `verifier_status` and kept honest in tests. */
export const STATUS = {
  spec: `shade spec ${SPEC_VERSION}`,
  structuralChecks: "available: schema, audience/nonce binding, expiry, requirement coverage",
  registry: "not available: the passport registry contract is not deployed yet",
  proofVerification: "not available: the proof system is not chosen yet",
  bestPossibleVerdict: "incomplete",
  holdsKeys: false,
} as const;

const documentSchemas = { passport: Passport, statement: Statement, request: DisclosureRequest, proof: ProofEnvelope };

/**
 * Builds the MCP server. Transport wiring lives in index.ts so tests can connect an in-memory client.
 * Every tool is local and read-only: no network, no keys.
 */
export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Tools for ShadowAgent passport checks (spec draft v0). Use build_disclosure_request to ask another agent for only the facts you need, validate_document to check a passport, request or proof, and check_presentation to run the structural checks on a proof you received. Registry and proof verification are not available yet, so no presentation is ever reported as accepted; call verifier_status for details.",
    },
  );

  server.registerTool(
    "verifier_status",
    {
      title: "What can be verified today",
      description:
        "Reports which verification steps this server can run now and which are not available yet (registry, proof system).",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () => run(() => STATUS),
  );

  server.registerTool(
    "build_disclosure_request",
    {
      title: "Build a disclosure request",
      description:
        'Creates a ShadowAgent disclosure request with a fresh random nonce. Requirements are statements such as {"kind":"passport-active"}, {"kind":"tier","min":"basic"}, {"kind":"permission","scope":"trade.spot","limit":{"asset":"usd","op":"lte","amount":"1000"}}, {"kind":"performance","metric":"win-rate","min":0.55,"window":"30d"}, {"kind":"compliance","policy":"not-sanctioned"}, {"kind":"ownership"}. Ask only for what you need.',
      inputSchema: {
        audience: z.string().min(1).max(128).describe("Your identifier as the verifier. The proof is bound to it."),
        requirements: z.array(z.unknown()).min(1).max(16).describe("Statements the agent must prove."),
        ttlSeconds: z.number().int().min(1).max(86_400).optional().describe("Lifetime in seconds. Default 300."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (args) =>
      run(() =>
        createDisclosureRequest({
          audience: args.audience,
          requirements: args.requirements.map((r) => Statement.parse(r)),
          ttlSeconds: args.ttlSeconds,
        }),
      ),
  );

  server.registerTool(
    "validate_document",
    {
      title: "Validate a passport, statement, request or proof",
      description:
        "Checks a document against the ShadowAgent spec v0 schema. Structural only: it does not verify any cryptographic proof.",
      inputSchema: {
        type: z.enum(["passport", "statement", "request", "proof"]),
        document: z.unknown().describe("The JSON document."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (args) =>
      run(() => {
        const r = documentSchemas[args.type].safeParse(args.document);
        return r.success
          ? { valid: true, errors: [] }
          : {
              valid: false,
              errors: r.error.issues.map((i) => ({ path: i.path.join(".") || "/", message: i.message })),
            };
      }),
  );

  server.registerTool(
    "check_presentation",
    {
      title: "Check a proof against your request",
      description:
        "Runs the verification steps on a proof envelope you received for a request you issued: schema, audience/nonce binding, expiry and requirement coverage. Registry and proof checks are reported as skipped because they are not available yet, so the verdict is at best 'incomplete'. Do not treat 'incomplete' as verified.",
      inputSchema: {
        request: z.unknown().describe("The disclosure request you sent."),
        envelope: z.unknown().describe("The proof envelope you received."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (args) => run(() => verifyPresentation(args.request, args.envelope)),
  );

  return server;
}
