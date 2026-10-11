import { PagePerception, ActionResult } from '../types/index.js';

export type AgentActionType = 'navigate' | 'click' | 'fill' | 'scroll' | 'extract' | 'finish';

export interface AgentAction {
  type: AgentActionType;
  url?: string;
  ref?: string;
  text?: string;
  direction?: 'down' | 'up' | 'top' | 'bottom';
  schema?: any;
  answer?: string;
}

export interface AgentDecision {
  thought: string;
  action: AgentAction;
}

export interface AgentStepRecord {
  stepNumber: number;
  thought: string;
  action: AgentAction;
  observation: string;
  durationMs: number;
  urlAfter: string;
}

export interface AgentRunResult {
  success: boolean;
  instruction: string;
  finalAnswer: string;
  steps: AgentStepRecord[];
  totalSteps: number;
  totalDurationMs: number;
  finalUrl: string;
  tokensEstimated: number;
  error?: string;
}

export interface AgentRunOptions {
  instruction: string;
  startUrl?: string;
  maxSteps?: number;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  headless?: boolean;
  stealth?: boolean;
  verbose?: boolean;
  timeout?: number;
  allowedDomains?: string[];
  blockPrivateIPs?: boolean;
  customLLM?: LLMClientInterface;
  onStep?: (step: AgentStepRecord) => void;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface LLMResponse {
  thought?: string;
  toolCalls?: LLMToolCall[];
  content?: string;
}

export interface LLMClientInterface {
  chat(messages: ChatMessage[], tools: any[]): Promise<LLMResponse>;
}
