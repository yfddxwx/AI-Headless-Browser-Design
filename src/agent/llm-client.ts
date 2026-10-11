import { ChatMessage, LLMClientInterface, LLMResponse, LLMToolCall } from './types.js';

export interface LLMConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
}

export class OpenAICompatibleLLMClient implements LLMClientInterface {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private timeout: number;

  constructor(config: LLMConfig = {}) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || process.env.AGENT_API_KEY || '';
    this.baseUrl = (config.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.model = config.model || process.env.AGENT_MODEL || 'gpt-4o-mini';
    this.timeout = config.timeout || 30000;
  }

  public async chat(messages: ChatMessage[], tools: any[]): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error(
        'Missing LLM API Key. Please provide apiKey in config or set OPENAI_API_KEY / AGENT_API_KEY in environment variables.'
      );
    }

    const endpoint = `${this.baseUrl}/chat/completions`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const payload: any = {
        model: this.model,
        messages,
        temperature: 0.1,
      };

      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API returned status ${response.status}: ${errorText.slice(0, 300)}`);
      }

      const data: any = await response.json();
      const choice = data.choices?.[0];
      if (!choice) {
        throw new Error('LLM API returned an empty response choices array.');
      }

      const message = choice.message;
      const content = message.content || '';
      const toolCalls: LLMToolCall[] = [];

      if (message.tool_calls && Array.isArray(message.tool_calls)) {
        for (const tc of message.tool_calls) {
          let args: any = {};
          try {
            args = typeof tc.function?.arguments === 'string' 
              ? JSON.parse(tc.function.arguments) 
              : tc.function?.arguments || {};
          } catch {
            args = {};
          }
          toolCalls.push({
            name: tc.function?.name || '',
            arguments: args,
          });
        }
      }

      return {
        content,
        thought: content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export class MockLLMClient implements LLMClientInterface {
  private queue: (LLMResponse | ((messages: ChatMessage[]) => LLMResponse))[] = [];

  constructor(responses: (LLMResponse | ((messages: ChatMessage[]) => LLMResponse))[] = []) {
    this.queue = [...responses];
  }

  public enqueue(response: LLMResponse | ((messages: ChatMessage[]) => LLMResponse)): void {
    this.queue.push(response);
  }

  public async chat(messages: ChatMessage[], _tools: any[]): Promise<LLMResponse> {
    if (this.queue.length === 0) {
      // Default fallback
      return {
        thought: 'No more planned responses. Concluding task.',
        toolCalls: [
          {
            name: 'finish',
            arguments: { answer: 'Mock agent task finished.' },
          },
        ],
      };
    }

    const item = this.queue.shift()!;
    if (typeof item === 'function') {
      return item(messages);
    }
    return item;
  }
}
