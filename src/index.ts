#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_VERSION, createServer } from "./server.js";

if (process.argv.includes("--version")) {
  console.log(SERVER_VERSION);
  process.exit(0);
}

const server = createServer();
await server.connect(new StdioServerTransport());
