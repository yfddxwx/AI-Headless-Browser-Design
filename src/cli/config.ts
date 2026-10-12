import fs from 'fs';
import path from 'path';
import os from 'os';

export interface PersistentConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

/**
 * Returns the path to the global agent-browser configuration directory (~/.agent-browser)
 */
export function getConfigDir(): string {
  return path.join(os.homedir(), '.agent-browser');
}

/**
 * Returns the path to the global config.json file
 */
export function getConfigFile(): string {
  return path.join(getConfigDir(), 'config.json');
}

/**
 * Reads persistent configuration from ~/.agent-browser/config.json
 */
export function readPersistentConfig(): PersistentConfig {
  const filePath = getConfigFile();
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Writes/merges persistent configuration into ~/.agent-browser/config.json
 */
export function writePersistentConfig(config: Partial<PersistentConfig>): PersistentConfig {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const existing = readPersistentConfig();
  const merged: PersistentConfig = { ...existing };

  if (config.apiKey !== undefined) merged.apiKey = config.apiKey;
  if (config.baseUrl !== undefined) merged.baseUrl = config.baseUrl;
  if (config.model !== undefined) merged.model = config.model;

  fs.writeFileSync(getConfigFile(), JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

/**
 * Parses a standard .env file and sets values into process.env if not already set
 */
export function loadDotEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // Ignore parse errors silently
  }
}

/**
 * Automatically loads all configuration layers in order of priority:
 * 1. Current process.env (already present)
 * 2. Local .env in current working directory
 * 3. Global ~/.agent-browser/.env
 * 4. Global ~/.agent-browser/config.json
 */
export function loadAllConfig(): void {
  // 1. Current working directory .env
  loadDotEnvFile(path.join(process.cwd(), '.env'));

  // 2. Global ~/.agent-browser/.env
  loadDotEnvFile(path.join(getConfigDir(), '.env'));

  // 3. Global ~/.agent-browser/config.json
  const userConfig = readPersistentConfig();
  if (userConfig.apiKey && !process.env.OPENAI_API_KEY && !process.env.AGENT_API_KEY) {
    process.env.OPENAI_API_KEY = userConfig.apiKey;
  }
  if (userConfig.baseUrl && !process.env.OPENAI_BASE_URL) {
    process.env.OPENAI_BASE_URL = userConfig.baseUrl;
  }
  if (userConfig.model && !process.env.AGENT_MODEL) {
    process.env.AGENT_MODEL = userConfig.model;
  }
}

/**
 * Masks an API key for safe display (e.g. sk-1234...5678)
 */
export function maskApiKey(key?: string): string {
  if (!key) return '(not set)';
  if (key.length <= 8) return '********';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
