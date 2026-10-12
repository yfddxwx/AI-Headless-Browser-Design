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
import { OpenAICompatibleLLMClient, MockLLMClient } from './llm-client.js';

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
3. FINAL ANSWER AGGREGATION (CRITICAL):
   - When calling finish(answer: string), you MUST provide a detailed, well-structured, comprehensive answer in Markdown directly fulfilling the user's instruction.
   - Do NOT just report operational steps (e.g. NEVER just say "Page loaded, extracting data" or "Action executed: extract").
   - Extract the actual data, item names, metrics, links, and takeaways from the page content into the answer.
   - For example, if asked to "find the top trending projects", list the actual top repository names, star counts, descriptions, and insights.
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
        description: 'Complete the task and deliver the final aggregated answer. The "answer" parameter MUST contain the comprehensive, synthesized findings/results answering the user instruction, formatted in clean Markdown with concrete details, names, and metrics.',
        parameters: {
          type: 'object',
          properties: {
            answer: {
              type: 'string',
              description: 'The final comprehensive synthesized answer containing the actual data and findings.',
            },
          },
          required: ['answer'],
        },
      },
    },
  ];

  /**
   * Dehydrate / prune historical browser perceptions in conversation history.
   * Strips bulky DOM Markdown and interactive element listings from past steps,
   * retaining URL, Title, Observations, and execution trail.
   * Returns estimated number of tokens saved.
   */
  public static pruneHistoricalPerceptions(
    history: ChatMessage[],
    keepRecentCount: number = 0
  ): number {
    let tokensSaved = 0;
    const perceptionIndices: number[] = [];
    for (let i = 0; i < history.length; i++) {
      if (
        history[i].role === 'user' &&
        history[i].content.includes('=== PAGE CONTENT (COMPRESSED MARKDOWN) ===')
      ) {
        perceptionIndices.push(i);
      }
    }

    const toPruneCount = Math.max(0, perceptionIndices.length - keepRecentCount);
    for (let j = 0; j < toPruneCount; j++) {
      const idx = perceptionIndices[j];
      const original = history[idx].content;

      const urlMatch = original.match(/URL:\s*([^\n]+)/);
      const titleMatch = original.match(/Title:\s*([^\n]+)/);
      const stepMatch = original.match(/--- CURRENT BROWSER STATE \(Step (\d+)\) ---/);
      const obsMatch = original.match(/\[Previous Action Observation\][\s\S]*?(?=\n\n--- CURRENT BROWSER STATE|\n--- CURRENT BROWSER STATE|$)/);

      const stepNum = stepMatch ? stepMatch[1] : '';
      const url = urlMatch ? urlMatch[1].trim() : '';
      const title = titleMatch ? titleMatch[1].trim() : '';

      let prunedContent = '';
      if (obsMatch) {
        prunedContent += `${obsMatch[0].trim()}\n\n`;
      }
      prunedContent += `--- BROWSER STATE SNAPSHOT (Step ${stepNum || '?'}, Pruned) ---
URL: ${url}
Title: ${title}
[Historical DOM Markdown & interactive elements pruned to save context tokens. See action & observation below.]`;

      const savedChars = original.length - prunedContent.length;
      if (savedChars > 0) {
        tokensSaved += Math.round(savedChars / 4);
      }

      history[idx].content = prunedContent;
    }

    return tokensSaved;
  }

  public static async run(options: AgentRunOptions): Promise<AgentRunResult> {
    const startTime = Date.now();
    const maxSteps = options.maxSteps || 15;
    const verbose = options.verbose !== false;
    const pruneContext = options.pruneContext !== false;
    const maxRecentPerceptions = options.maxRecentPerceptions || 1;

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
    let contextTokensSaved = 0;
    let lastObservation = '';
    const extractedRecords: any[] = [];
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

        // Context Pruning: Dehydrate older perception messages to avoid quadratic token growth
        if (pruneContext) {
          contextTokensSaved += this.pruneHistoricalPerceptions(
            conversationHistory,
            Math.max(0, maxRecentPerceptions - 1)
          );
        }

        // Build observation prompt based on current page state
        let currentPromptContent = '';
        if (lastObservation) {
          currentPromptContent += `[Previous Action Observation]\n${lastObservation}\n\n`;
        }

        if (currentPerception) {
          const perceptionSummary = `--- CURRENT BROWSER STATE (Step ${stepIndex}) ---
URL: ${currentPerception.url}
Title: ${currentPerception.title}
Interactive Elements Count: ${currentPerception.interactiveElements.length}

=== PAGE CONTENT (COMPRESSED MARKDOWN) ===
${currentPerception.compressedMarkdown.slice(0, 12000)}

=== AVAILABLE INTERACTIVE ELEMENTS (@Ref) ===
${currentPerception.interactiveElements
  .slice(0, 60)
  .map((e) => `• ${e.ref} [${e.tag.toUpperCase()}] "${e.text || e.name || ''}" -> ${e.href || e.selector}`)
  .join('\n')}`;

          currentPromptContent += perceptionSummary;
        } else {
          currentPromptContent += `No web page is currently loaded. Please use the navigate action to open a relevant URL.`;
        }

        conversationHistory.push({ role: 'user', content: currentPromptContent });

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
          // 1. Attempt fallback JSON parse
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

          // 2. Attempt regex parsing for text action calls (e.g. navigate(url="..."), Action executed: scroll)
          if (!action) {
            const content = llmResponse.content;

            // scroll (e.g. scroll, Action executed: scroll, scroll(down), scroll())
            const scrollMatch = content.match(/action(?:\s+executed)?:\s*scroll\b(?:\s*\(\s*(?:(?:direction\s*=\s*)?["']?(\w+)["']?)?\s*\))?/i) ||
                                content.match(/\bscroll\s*\(\s*(?:(?:direction\s*=\s*)?["']?(\w+)["']?)?\s*\)/i);
            if (scrollMatch) {
              action = { type: 'scroll', direction: (scrollMatch[1] as any) || 'down' };
            }

            // navigate
            if (!action) {
              const navMatch = content.match(/action(?:\s+executed)?:\s*navigate(?:\s*\(\s*(?:(?:url\s*=\s*)?["']?([^"'\s)]+)["']?)?\s*\)|\s+["']?([^"'\s)]+)["']?)/i) ||
                               content.match(/\bnavigate\s*\(\s*(?:(?:url\s*=\s*)?["']?([^"'\s)]+)["']?)?\s*\)/i);
              const url = navMatch ? (navMatch[1] || navMatch[2]) : null;
              if (url) {
                action = { type: 'navigate', url };
              }
            }

            // click
            if (!action) {
              const clickMatch = content.match(/action(?:\s+executed)?:\s*click(?:\s*\(\s*(?:(?:ref\s*=\s*)?["']?(@\w+)["']?)?\s*\)|\s+["']?(@\w+)["']?)/i) ||
                                 content.match(/\bclick\s*\(\s*(?:(?:ref\s*=\s*)?["']?(@\w+)["']?)?\s*\)/i);
              const ref = clickMatch ? (clickMatch[1] || clickMatch[2]) : null;
              if (ref) {
                action = { type: 'click', ref };
              }
            }

            // fill
            if (!action) {
              const fillMatch = content.match(/action(?:\s+executed)?:\s*fill(?:\s*\(\s*(?:ref\s*=\s*)?["']?(@\w+)["']?\s*,\s*(?:text\s*=\s*)?["']?([^"'\)]*)["']?\s*\))/i) ||
                                content.match(/\bfill\s*\(\s*(?:ref\s*=\s*)?["']?(@\w+)["']?\s*,\s*(?:text\s*=\s*)?["']?([^"'\)]*)["']?\s*\)/i);
              if (fillMatch && fillMatch[1]) {
                action = { type: 'fill', ref: fillMatch[1], text: fillMatch[2] || '' };
              }
            }

            // extract
            if (!action) {
              const extractMatch = content.match(/action(?:\s+executed)?:\s*extract\b(?:\s*\(.*?\))?/i);
              if (extractMatch) {
                action = { type: 'extract', schema: {} };
              }
            }
          }
        }

        // Fallback default action if LLM returned plain text answer
        if (!action) {
          const content = llmResponse.content || '';
          if (/\b(?:scroll down|scrolling down|let me scroll)\b/i.test(content)) {
            action = { type: 'scroll', direction: 'down' };
          } else {
            action = {
              type: 'finish',
              answer: content || 'Task completed.',
            };
          }
        }

        if (verbose) {
          console.log(`💭 Thought: ${thought}`);
          console.log(`⚡ Action: ${action.type}(${JSON.stringify(action)})`);
        }

        // Check if finished
        if (action.type === 'finish') {
          let resolvedAnswer = (action.answer || thought).trim();

          // Final Answer Aggregation Guard:
          // If the model output purely procedural text (e.g. "I will extract data", "Action executed", "Done")
          // and we have page perception, synthesize a rich final answer answering the user's instruction.
          const isProcedural =
            !resolvedAnswer ||
            /action executed:/i.test(resolvedAnswer) ||
            /let me navigate/i.test(resolvedAnswer) ||
            /the click navigated/i.test(resolvedAnswer) ||
            (resolvedAnswer.length < 80 &&
              /^(task completed|action executed|已成功加载|我提取|正在提取|done\.?)/i.test(resolvedAnswer)) ||
            /action executed:\s*extract/i.test(resolvedAnswer);

          if (
            isProcedural &&
            currentPerception &&
            llmClient &&
            !(llmClient instanceof MockLLMClient)
          ) {
            if (verbose) {
              console.log('🔄 [AgentRunner] 正在执行终局答案智能聚合 (Synthesizing comprehensive final answer)...');
            }
            try {
              // Ensure historical perceptions are pruned, keeping the latest active state
              if (pruneContext) {
                contextTokensSaved += this.pruneHistoricalPerceptions(conversationHistory, 1);
              }

              let extractedContext = '';
              if (extractedRecords.length > 0) {
                extractedContext = `\n\n=== ACCUMULATED EXTRACTED DATA ===\n${JSON.stringify(extractedRecords, null, 2).slice(0, 8000)}`;
              }

              const synthesisPrompt: ChatMessage[] = [
                ...conversationHistory,
                {
                  role: 'user',
                  content: `[Final Answer Aggregation Request]\nYou have located the relevant content on the page (${currentPerception.url}). Now synthesize and provide the full, comprehensive answer to the user's original goal: "${options.instruction}". Extract specific names, facts, numbers, and summaries from the page content into a clean Markdown report.${extractedContext}\nDo NOT output tool calls, just output the final answer text.`,
                },
              ];
              const synthesisResponse = await llmClient.chat(synthesisPrompt, []);
              if (synthesisResponse.content && synthesisResponse.content.trim().length > 30) {
                resolvedAnswer = synthesisResponse.content.trim();
              }
            } catch {
              // Fallback to resolvedAnswer if synthesis fails
            }
          }

          finalAnswer = resolvedAnswer;
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
            extractedRecords.push(extracted.data);
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

        lastObservation = observation;

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
      contextTokensSaved,
      error: errorMsg,
    };
  }
}
