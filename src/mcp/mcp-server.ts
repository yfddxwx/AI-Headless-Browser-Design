import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { BrowserManager } from '../core/browser-manager.js';
import { SessionContext } from '../core/session-context.js';

export class AgentBrowserMCPServer {
  private server: Server;
  private browserManager: BrowserManager;
  private currentSession: SessionContext | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'ai-native-headless-browser',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.browserManager = new BrowserManager({ headless: true });
    this.setupHandlers();
  }

  private async getOrCreateSession(): Promise<SessionContext> {
    if (!this.currentSession) {
      this.currentSession = await this.browserManager.createSession();
    }
    return this.currentSession;
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'browser_navigate',
            description: 'Navigate to a target URL with SSRF security guardrails and return compressed semantic DOM and interactive elements.',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'The HTTP or HTTPS URL to navigate to.',
                },
              },
              required: ['url'],
            },
          },
          {
            name: 'browser_act',
            description: 'Execute a deterministic action on an interactive element by reference ID (@1, @2, etc.).',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['click', 'fill', 'scroll'],
                  description: 'The action type to perform.',
                },
                ref: {
                  type: 'string',
                  description: 'The target element reference ID (e.g. "@1"). Required for click and fill.',
                },
                text: {
                  type: 'string',
                  description: 'Text to input. Required for fill action.',
                },
                direction: {
                  type: 'string',
                  enum: ['down', 'up', 'top', 'bottom'],
                  description: 'Scroll direction. Required for scroll action.',
                },
              },
              required: ['action'],
            },
          },
          {
            name: 'browser_get_snapshot',
            description: 'Fetch the latest compressed Markdown view and active interactive element registry of the current page.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'browser_get_visual_snapshot',
            description: 'Fetch an annotated visual screenshot with Set-of-Mark (SOM) bounding boxes and @Ref labels for multimodal LLM vision understanding, alongside element coordinates.',
            inputSchema: {
              type: 'object',
              properties: {
                includeRawScreenshot: {
                  type: 'boolean',
                  description: 'Whether to also include unannotated clean screenshot in response.',
                },
              },
            },
          },
          {
            name: 'browser_click_coordinate',
            description: 'Click directly on a physical (x, y) pixel coordinate in the current viewport.',
            inputSchema: {
              type: 'object',
              properties: {
                x: {
                  type: 'number',
                  description: 'Horizontal X coordinate in pixels.',
                },
                y: {
                  type: 'number',
                  description: 'Vertical Y coordinate in pixels.',
                },
              },
              required: ['x', 'y'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const session = await this.getOrCreateSession();

      switch (request.params.name) {
        case 'browser_navigate': {
          const url = String(request.params.arguments?.url || '');
          try {
            const perception = await session.navigate(url);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(perception, null, 2),
                },
              ],
            };
          } catch (err: any) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Navigation Error: ${err.message}` }],
            };
          }
        }

        case 'browser_act': {
          const args = request.params.arguments || {};
          const action = String(args.action);
          const ref = args.ref ? String(args.ref) : '';
          const text = args.text ? String(args.text) : '';
          const direction = (args.direction as any) || 'down';

          if (action === 'click') {
            const result = await session.click(ref);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          } else if (action === 'fill') {
            const result = await session.fill(ref, text);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          } else if (action === 'scroll') {
            const result = await session.scroll(direction);
            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
          }

          return {
            isError: true,
            content: [{ type: 'text', text: `Unsupported action: ${action}` }],
          };
        }

        case 'browser_get_snapshot': {
          const perception = await session.getPerception();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(perception, null, 2),
              },
            ],
          };
        }

        case 'browser_get_visual_snapshot': {
          const includeRaw = Boolean(request.params.arguments?.includeRawScreenshot);
          const visual = await session.getVisualSnapshot({ includeRawScreenshot: includeRaw });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(visual, null, 2),
              },
            ],
          };
        }

        case 'browser_click_coordinate': {
          const x = Number(request.params.arguments?.x);
          const y = Number(request.params.arguments?.y);
          const result = await session.clickCoordinate(x, y);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        default:
          return {
            isError: true,
            content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }],
          };
      }
    });
  }

  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  public async stop(): Promise<void> {
    if (this.currentSession) {
      await this.currentSession.close();
      this.currentSession = null;
    }
    await this.browserManager.close();
  }
}

// Standalone execution entrypoint if run directly
if (process.argv[1]?.endsWith('mcp-server.ts') || process.argv[1]?.endsWith('mcp-server.js')) {
  const mcpServer = new AgentBrowserMCPServer();
  mcpServer.start().catch(console.error);
}
