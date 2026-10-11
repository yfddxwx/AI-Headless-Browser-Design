#!/usr/bin/env node

import { runCli } from '../dist/cli/index.js';

runCli(process.argv.slice(2)).catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
