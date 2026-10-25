---
name: add-mcp-tool
description: "Use when adding or changing an MCP tool in relay-gateway."
---

# Adding an MCP tool

The MCP surface is in `src/mcp/server.ts`. It is a thin skin over `src/core/relay.ts`, so the two
surfaces cannot drift apart in behaviour — only in shape.

## Procedure

1. **Put the behaviour in the service.** If the tool needs a rule, it goes in
   `src/core/relay.ts` first. A tool that reaches into the store directly breaks the invariant
   that the HTTP API and the MCP tools share one implementation.
2. **Write the test** in `test/integration/mcp.test.ts`, over a real `InMemoryTransport` pair.
3. **Register the tool** with `server.registerTool(name, { title, description, inputSchema }, handler)`.
   The description is what an agent reads to decide whether to use the tool — write it as if the
   agent has never seen this project, and say which layer the tool acts on.
4. **Use zod** for the input schema. It is a runtime dependency already.
5. **Return the envelope as JSON text.** The MCP content shape is text; put
   `JSON.stringify(envelope(data), null, 2)` in it.
6. **Return errors as `isError: true`** with the failure envelope, not as a thrown exception.
7. **Update the tool table** in `README.md` and in the docs page in `src/ui/dashboard.ts`.

## Rules

- **The tool name is a public contract.** `relay_` prefix, snake_case, verb first.
- **Never return a bot token.** Not in data, not in an error, not in a hint.
- **Descriptions must state the constraint.** For `relay_send_message`, the description must say
  that the tenant must be connected and that a bot can only reach people who started a chat with
  it. An agent that does not know this will try to broadcast and fail.
- **Do not add an LLM call to L1.** The AI agent lives in L2 (the vendor's own service). A tool
  that sends message content to a third-party API would break Bot Developer ToS §5.4.
- **One tool, one job.** If a tool needs a mode flag, it is two tools.

## Definition of done

`npm run lint && npm run typecheck && npm test` pass, and the new tool has a test that fails
without the change.
