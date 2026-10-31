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
git clone https://github.com/shadowagentapp/shade-sdk.git
git clone https://github.com/shadowagentapp/shade-mcp.git
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

## Example

A runnable example that needs no network: [`examples/client.mjs`](examples/client.mjs) starts the server over stdio, lists the tools, builds a request and checks an `example-only` envelope (comes back `rejected` at the proof step, by design).

```sh
pnpm install && pnpm build
pnpm example
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

## Contributing

This is a pre-release draft, so issues and small pull requests are welcome, especially on the spec text and edge
cases.

- Open an issue first for anything bigger than a fix: <https://github.com/shadowagentapp/shade-mcp/issues>.
- Before a pull request, run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`; CI runs the same.
- Use [Conventional Commits](https://www.conventionalcommits.org) (`fix: ...`, `feat: ...`, `docs: ...`).
- Do not add chain ids, contract addresses, fees or token numbers: none are decided. Example data uses filler bytes and
  local dev chain ids, and says so.
- Security issues: email core@shadowagent.app instead of opening a public issue.

## License

MIT, see [LICENSE](LICENSE).
