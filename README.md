# shade-mcp

An [MCP](https://modelcontextprotocol.io) server that lets AI agents use the
[ShadowAgent](https://shadowagent.app) passport format: ask another agent for only the facts you need, and check the
proof it sends back.

> **Status: draft, pre-release.** Built on `@shadowagentapp/sdk` (spec draft v0). The passport registry and the proof
> system do not exist yet, so `check_presentation` runs the structural steps only and **never reports a presentation
> as accepted**. The best verdict today is `incomplete`. Not published to npm yet.

Local and read-only: no network calls, no keys, nothing is signed or sent.

## Tools

| Tool                       | What it does                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `verifier_status`          | which verification steps work today and which are not available yet                      |
| `build_disclosure_request` | a disclosure request with a fresh random nonce, from your audience and requirements      |
| `validate_document`        | schema check for a passport, statement, request or proof envelope                        |
| `check_presentation`       | schema, audience/nonce binding, expiry and requirement coverage for a proof you received |

Planned once the protocol exists (not built): registry lookup, real proof verification, and the Verification API.

## Run

From a checkout, with `shade-sdk` cloned next to it (the dependency is `file:../shade-sdk` until it is on npm):

```sh
git clone git@github.com:shadowagentapp/shade-sdk.git
git clone git@github.com:shadowagentapp/shade-mcp.git
(cd shade-sdk && pnpm install && pnpm build)
cd shade-mcp && pnpm install && pnpm build
```

Then add it to your MCP client, for example:

```json
{
  "mcpServers": {
    "shade": { "command": "node", "args": ["/path/to/shade-mcp/dist/index.js"] }
  }
}
```

## Develop

```sh
pnpm install
pnpm test       # in-memory MCP client against the server
pnpm lint
pnpm typecheck
pnpm build
```

Fixtures in `test/fixtures/` are the `shade-spec` example vectors: filler bytes and the reserved `example-only` proof
system, not real data.

## License

MIT
