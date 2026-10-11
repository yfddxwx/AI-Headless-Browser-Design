#!/usr/bin/env node

import { AgentBrowserMCPServer } from '../dist/mcp/mcp-server.js';

const server = new AgentBrowserMCPServer();

server.start().catch((err) => {
  console.error('Failed to start AgentBrowser MCP Server:', err);
  process.exit(1);
});

// Handle graceful shutdown
const shutdown = async () => {
  try {
    await server.stop();
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
