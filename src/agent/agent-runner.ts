import { BrowserManager } from '../core/browser-manager.js';
import { SessionContext } from '../core/session-context.js';
import { PagePerception } from '../types/index.js';
import {
  AgentAction,
  AgentRunOptions,
  AgentRunResult,
  AgentStepRecord,
  ChatMessage,
  LLMClientInterface,
} from './types.js';
import { OpenAICompatibleLLMClient } from './llm-client.js';

export class AgentRunner {
  private static readonly SYSTEM_PROMPT = `You are NoHead-AI, an autonomous AI web browsing agent.
Your objective is to accomplish the user's instruction efficiently and accurately using deterministic browser actions.

At each step, you will be provided with:
1. The current page URL and Title.
2. A compressed, semantically cleaned Markdown perception of the page.
3. A list of interactive elements marked with deterministic reference handles (@1, @2, @3, ...).

You have access to the following actions:
- navigate(url: string): Navigate to a new HTTP/HTTPS web address.
- click(ref: string): Click an interactive element using its reference handle (e.g. "@2").
- fill(ref: string, text: string): Enter text into an input field or textarea (e.g. ref: "@4", text: "query").
- scroll(direction: "down" | "up" | "top" | "bottom"): Scroll the page viewport.
- extract(schema: object): Extract structured data matching a schema.
- finish(answer: string): Complete the task and provide the final answer to the user.

Rules:
1. Always analyze the current page perception and plan your next action carefully.
2. Do NOT guess CSS selectors or XPaths. Always use the provided @Ref handles (@1, @2, etc.).
3. When you have found the answer or accomplished the requested goal, call finish with the comprehensive answer.
4. If an action fails, inspect the error message and choose an alternative path.`;

  private static readonly TOOLS_DECLARATION = [
    {
      type: 'function',
      function: {
        name: 'navigate',
        description: 'Navigate to a web URL.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Target HTTP or HTTPS URL.' },
          },
          required: ['url'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'click',
        description: 'Click an element using its @Ref handle.',
        parameters: {
          type: 'object',
          properties: {
            ref: { type: 'string', description: 'Reference ID (e.g. "@1").' },
          },
          required: ['ref'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'fill',
        description: 'Input text into a field using its @Ref handle.',
        parameters: {
          type: 'object',
          properties: {
            ref: { type: 'string', description: 'Reference ID (e.g. "@3").' },
            text: { type: 'string', description: 'Text to type into the input.' },
          },
          required: ['ref', 'text'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'scroll',
        description: 'Scroll the viewport.',
        parameters: {
          type: 'object',
          properties: {
            direction: {
              type: 'string',
              enum: ['down', 'up', 'top', 'bottom'],
              description: 'Direction to scroll.',
            },
          },
          required: ['direction'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'extract',
        description: 'Extract structured data from the page.',
        parameters: {
          type: 'object',
          properties: {
            schema: { type: 'object', description: 'Schema definition for extraction.' },
          },
          required: ['schema'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'finish',
        description: 'Complete the task with a final answer.',
        parameters: {
          type: 'object',
          properties: {
            answer: { type: 'string', description: 'The final comprehensive answer to the user.' },
          },
          required: ['answer'],
        },
      },
    },
  ];

  public static async run(options: AgentRunOptions): Promise<AgentRunResult> {
    const startTime = Date.now();
    const maxSteps = options.maxSteps || 15;
    const verbose = options.verbose !== false;

    const browserManager = new BrowserManager({
      headless: options.headless !== false,
      stealth: options.stealth !== false,
      ignoreHTTPSErrors: true,
      allowedDomains: options.allowedDomains,
      blockPrivateIPs: options.blockPrivateIPs,
      timeout: options.timeout || 30000,
    });

    const session = await browserManager.createSession();
    const llmClient: LLMClientInterface =
      options.customLLM ||
      new OpenAICompatibleLLMClient({
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
        model: options.model,
        timeout: options.timeout,
      });

    const steps: AgentStepRecord[] = [];
    let currentPerception: PagePerception | null = null;
    let finalAnswer = '';
    let success = false;
    let tokensEstimated = 0;
    let errorMsg: string | undefined;

    try {
      // 1. Initial navigation if startUrl provided
      if (options.startUrl) {
        if (verbose) {
          console.log(`🌐 [AgentRunner] Navigating to initial URL: ${options.startUrl}`);
        }
        currentPerception = await session.navigate(options.startUrl);
        tokensEstimated += currentPerception.tokensEstimated;
      }

      const conversationHistory: ChatMessage[] = [
        { role: 'system', content: this.SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Goal: ${options.instruction}${
            options.startUrl ? `\nInitial page loaded: ${options.startUrl}` : ''
          }`,
        },
      ];

      // 2. ReAct Autonomous Execution Loop
      for (let stepIndex = 1; stepIndex <= maxSteps; stepIndex++) {
        const stepStartTime = Date.now();

        // Build observation prompt based on current page state
        if (currentPerception) {
          const perceptionSummary = `--- CURRENT BROWSER STATE (Step ${stepIndex}) ---
URL: ${currentPerception.url}
Title: ${currentPerception.title}
Interactive Elements Count: ${currentPerception.interactiveElements.length}

=== PAGE CONTENT (COMPRESSED MARKDOWN) ===
${currentPerception.compressedMarkdown.slice(0, 4000)}

=== AVAILABLE INTERACTIVE ELEMENTS (@Ref) ===
${currentPerception.interactiveElements
  .slice(0, 40)
  .map((e) => `• ${e.ref} [${e.tag.toUpperCase()}] "${e.text || e.name || ''}" -> ${e.href || e.selector}`)
  .join('\n')}`;

          conversationHistory.push({ role: 'user', content: perceptionSummary });
        } else {
          conversationHistory.push({
            role: 'user',
            content: `No web page is currently loaded. Please use the navigate action to open a relevant URL.`,
          });
        }

        if (verbose) {
          console.log(`\n🤖 [Step ${stepIndex}/${maxSteps}] Planning next action...`);
        }

        // Consult LLM
        const llmResponse = await llmClient.chat(conversationHistory, this.TOOLS_DECLARATION);
        const thought = (llmResponse.thought || llmResponse.content || 'Determining action').trim();

        // Extract action from tool call or fallback JSON
        let action: AgentAction | null = null;

        if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
          const call = llmResponse.toolCalls[0];
          action = {
            type: call.name as any,
            ...call.arguments,
          };
        } else if (llmResponse.content) {
          // Attempt fallback JSON parse
          const jsonMatch = llmResponse.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.action) {
                action = {
                  type: parsed.action,
                  ...parsed,
                };
              }
            } catch {
              // ignore
            }
          }
        }

        // Fallback default action if LLM returned plain text answer
        if (!action) {
          action = {
            type: 'finish',
            answer: llmResponse.content || 'Task completed.',
          };
        }

        if (verbose) {
          console.log(`💭 Thought: ${thought}`);
          console.log(`⚡ Action: ${action.type}(${JSON.stringify(action)})`);
        }

        // Check if finished
        if (action.type === 'finish') {
          finalAnswer = action.answer || thought;
          success = true;
          const stepRecord: AgentStepRecord = {
            stepNumber: stepIndex,
            thought,
            action,
            observation: 'Task completed successfully.',
            durationMs: Date.now() - stepStartTime,
            urlAfter: session.getRawPage().url(),
          };
          steps.push(stepRecord);
          if (options.onStep) options.onStep(stepRecord);
          break;
        }

        // Execute action on browser
        let observation = '';
        try {
          if (action.type === 'navigate') {
            if (!action.url) throw new Error('Missing "url" parameter for navigate action.');
            currentPerception = await session.navigate(action.url);
            tokensEstimated += currentPerception.tokensEstimated;
            observation = `Successfully navigated to ${currentPerception.url}. Page title: "${currentPerception.title}". Found ${currentPerception.interactiveElements.length} interactive elements.`;
          } else if (action.type === 'click') {
            if (!action.ref) throw new Error('Missing "ref" parameter for click action.');
            const res = await session.click(action.ref);
            currentPerception = await session.getPerception();
            tokensEstimated += currentPerception.tokensEstimated;
            observation = res.success
              ? `Clicked ${action.ref}. StateDiff: ${res.diffSummary || 'Action executed successfully.'}`
              : `Click on ${action.ref} failed: ${res.error || res.message}`;
          } else if (action.type === 'fill') {
            if (!action.ref) throw new Error('Missing "ref" parameter for fill action.');
            const res = await session.fill(action.ref, action.text || '');
            currentPerception = await session.getPerception();
            observation = res.success
              ? `Filled ${action.ref} with "${action.text}".`
              : `Fill failed on ${action.ref}: ${res.error || res.message}`;
          } else if (action.type === 'scroll') {
            const dir = action.direction || 'down';
            const res = await session.scroll(dir);
            currentPerception = await session.getPerception();
            observation = `Scrolled ${dir}.`;
          } else if (action.type === 'extract') {
            const extracted = await session.extractData(action.schema || {});
            observation = `Extracted data: ${JSON.stringify(extracted.data).slice(0, 1000)}`;
          } else {
            observation = `Unknown action type "${action.type}".`;
          }
        } catch (execErr: any) {
          observation = `Action execution error: ${execErr.message}`;
        }

        if (verbose) {
          console.log(`👁️ Observation: ${observation.slice(0, 300)}`);
        }

        const stepRecord: AgentStepRecord = {
          stepNumber: stepIndex,
          thought,
          action,
          observation,
          durationMs: Date.now() - stepStartTime,
          urlAfter: session.getRawPage().url(),
        };

        steps.push(stepRecord);
        if (options.onStep) options.onStep(stepRecord);

        // Append assistant and tool response to history for next cycle
        conversationHistory.push({
          role: 'assistant',
          content: `${thought}\nAction executed: ${action.type}`,
        });
      }

      if (!success && !finalAnswer) {
        finalAnswer = `Reached maximum step limit (${maxSteps}) without explicit finish.`;
        errorMsg = 'Exceeded maximum step budget.';
      }
    } catch (err: any) {
      errorMsg = err.message;
      success = false;
      finalAnswer = finalAnswer || `Execution halted due to error: ${err.message}`;
    } finally {
      await session.close();
      await browserManager.close();
    }

    const totalDurationMs = Date.now() - startTime;

    return {
      success,
      instruction: options.instruction,
      finalAnswer,
      steps,
      totalSteps: steps.length,
      totalDurationMs,
      finalUrl: steps.length > 0 ? steps[steps.length - 1].urlAfter : '',
      tokensEstimated,
      error: errorMsg,
    };
  }
}
