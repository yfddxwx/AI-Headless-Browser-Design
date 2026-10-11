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
          {
            name: 'browser_list_tabs',
            description: 'List all open browser tabs with their tabId, title, URL, and active status.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'browser_create_tab',
            description: 'Open a new browser tab, optionally navigating to a specified URL.',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'Optional initial URL for the new tab.',
                },
              },
            },
          },
          {
            name: 'browser_switch_tab',
            description: 'Switch active focus to a specific tab by tabId (e.g. "tab-2") and return its page perception.',
            inputSchema: {
              type: 'object',
              properties: {
                tabId: {
                  type: 'string',
                  description: 'The target tab ID to switch to.',
                },
              },
              required: ['tabId'],
            },
          },
          {
            name: 'browser_close_tab',
            description: 'Close a specific browser tab by tabId.',
            inputSchema: {
              type: 'object',
              properties: {
                tabId: {
                  type: 'string',
                  description: 'The tab ID to close.',
                },
              },
              required: ['tabId'],
            },
          },
          {
            name: 'browser_export_vault',
            description: 'Export all current cookies and origin storage to a secure SessionVault for authentication persistence.',
            inputSchema: {
              type: 'object',
              properties: {
                filepath: {
                  type: 'string',
                  description: 'Optional file path to write the vault JSON to.',
                },
              },
            },
          },
          {
            name: 'browser_import_vault',
            description: 'Import cookies and storage from a SessionVault JSON or file to restore login state.',
            inputSchema: {
              type: 'object',
              properties: {
                filepath: {
                  type: 'string',
                  description: 'File path to load the vault JSON from.',
                },
                vault: {
                  type: 'object',
                  description: 'Direct SessionVault JSON object.',
                },
              },
            },
          },
          {
            name: 'browser_detect_captcha',
            description: 'Inspect the active page for Cloudflare Turnstile, Google reCAPTCHA, hCaptcha, or bot mitigation barriers.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'browser_scroll_overlap',
            description: 'Scroll viewport continuously with a 20% overlap buffer to avoid cutting off multi-line content.',
            inputSchema: {
              type: 'object',
              properties: {
                direction: {
                  type: 'string',
                  enum: ['down', 'up'],
                  description: 'Scroll direction (down or up).',
                },
                overlapRatio: {
                  type: 'number',
                  description: 'Overlap ratio buffer between 0.0 and 0.5 (default 0.2).',
                },
              },
              required: ['direction'],
            },
          },
          {
            name: 'browser_get_network_stats',
            description: 'Fetch network shielding statistics: total requests, blocked trackers/ads, and intercepted resources.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'browser_configure_network_shield',
            description: 'Update network shield traffic blocking configuration (e.g. blockMedia, blockAnalytics, blockFonts).',
            inputSchema: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                blockAnalytics: { type: 'boolean' },
                blockMedia: { type: 'boolean' },
                blockFonts: { type: 'boolean' },
              },
            },
          },
          {
            name: 'browser_extract_structured_data',
            description: 'Extract strongly-typed structured records matching a JSON schema (or field definitions) from the active page with semantic clustering and prompt injection defenses.',
            inputSchema: {
              type: 'object',
              properties: {
                schema: {
                  type: 'object',
                  description: 'Target JSON schema or field mapping dictionary (e.g. { title: "string", price: "number" }).',
                },
                containerSelector: {
                  type: 'string',
                  description: 'Optional CSS selector hint for repeating item containers.',
                },
                preferMetadata: {
                  type: 'boolean',
                  description: 'Whether to prioritize JSON-LD / Schema.org metadata if present (default true).',
                },
                maxItems: {
                  type: 'number',
                  description: 'Maximum number of items to extract (for array schemas).',
                },
              },
              required: ['schema'],
            },
          },
          {
            name: 'browser_extract_metadata',
            description: 'Extract standard web metadata including Schema.org JSON-LD scripts, OpenGraph, Twitter Cards, canonical URL, and author.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'browser_get_active_challenges',
            description: 'Fetch all active Human-in-the-Loop (HITL) challenges (Cloudflare, reCAPTCHA, 2FA/OTP) currently blocking execution.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'browser_resolve_challenge',
            description: 'Resolve an active HITL challenge by challengeId with human confirmation, bypass token, or solver note.',
            inputSchema: {
              type: 'object',
              properties: {
                challengeId: {
                  type: 'string',
                  description: 'The ID of the active challenge to resolve.',
                },
                solved: {
                  type: 'boolean',
                  description: 'Whether the challenge was successfully resolved (default true).',
                },
                resolutionToken: {
                  type: 'string',
                  description: 'Optional bypass or solver token.',
                },
                notes: {
                  type: 'string',
                  description: 'Optional operator or solver notes.',
                },
              },
              required: ['challengeId'],
            },
          },
          {
            name: 'browser_configure_hitl',
            description: 'Configure Human-in-the-Loop circuit breaker behavior (enable/disable, autoBreakOnCaptcha, defaultTimeoutMs).',
            inputSchema: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                autoBreakOnCaptcha: { type: 'boolean' },
                defaultTimeoutMs: { type: 'number' },
              },
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

        case 'browser_list_tabs': {
          const tabs = await session.listTabs();
          return {
            content: [{ type: 'text', text: JSON.stringify(tabs, null, 2) }],
          };
        }

        case 'browser_create_tab': {
          const url = request.params.arguments?.url ? String(request.params.arguments.url) : undefined;
          const result = await session.createTab(url);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'browser_switch_tab': {
          const tabId = String(request.params.arguments?.tabId || '');
          const result = await session.switchTab(tabId);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'browser_close_tab': {
          const tabId = String(request.params.arguments?.tabId || '');
          const result = await session.closeTab(tabId);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'browser_export_vault': {
          const filepath = request.params.arguments?.filepath ? String(request.params.arguments.filepath) : undefined;
          const vault = await session.exportVault(filepath);
          return {
            content: [{ type: 'text', text: JSON.stringify(vault, null, 2) }],
          };
        }

        case 'browser_import_vault': {
          const filepath = request.params.arguments?.filepath ? String(request.params.arguments.filepath) : undefined;
          const vaultObj = request.params.arguments?.vault as any;
          const target = filepath || vaultObj;
          if (!target) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Either filepath or vault object must be provided.' }],
            };
          }
          const result = await session.importVault(target);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'browser_detect_captcha': {
          const result = await session.detectCaptcha();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'browser_scroll_overlap': {
          const direction = (request.params.arguments?.direction as any) || 'down';
          const overlap = request.params.arguments?.overlapRatio !== undefined 
            ? Number(request.params.arguments.overlapRatio) 
            : 0.2;
          const result = await session.scrollOverlap(direction, overlap);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'browser_get_network_stats': {
          const stats = session.getNetworkStats();
          return {
            content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }],
          };
        }

        case 'browser_configure_network_shield': {
          const args = request.params.arguments || {};
          session.configureNetworkShield(args as any);
          return {
            content: [{ type: 'text', text: 'Network shield configuration updated successfully.' }],
          };
        }

        case 'browser_extract_structured_data': {
          const schema = request.params.arguments?.schema as any;
          if (!schema) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Schema argument is required for structured extraction.' }],
            };
          }
          const options = {
            containerSelector: request.params.arguments?.containerSelector ? String(request.params.arguments.containerSelector) : undefined,
            preferMetadata: request.params.arguments?.preferMetadata !== undefined ? Boolean(request.params.arguments.preferMetadata) : true,
            maxItems: request.params.arguments?.maxItems ? Number(request.params.arguments.maxItems) : undefined,
          };
          const result = await session.extractData(schema, options);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'browser_extract_metadata': {
          const result = await session.extractMetadata();
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'browser_get_active_challenges': {
          const challenges = session.getActiveChallenges();
          return {
            content: [{ type: 'text', text: JSON.stringify(challenges, null, 2) }],
          };
        }

        case 'browser_resolve_challenge': {
          const challengeId = String(request.params.arguments?.challengeId || '');
          if (!challengeId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'challengeId is required to resolve an active challenge.' }],
            };
          }
          const solved = request.params.arguments?.solved !== undefined ? Boolean(request.params.arguments.solved) : true;
          const resolutionToken = request.params.arguments?.resolutionToken ? String(request.params.arguments.resolutionToken) : undefined;
          const notes = request.params.arguments?.notes ? String(request.params.arguments.notes) : undefined;

          const success = session.resolveChallenge(challengeId, {
            solved,
            resolutionToken,
            notes,
            resolvedBy: 'human',
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ challengeId, resolved: success }, null, 2),
              },
            ],
          };
        }

        case 'browser_configure_hitl': {
          const args = request.params.arguments || {};
          session.configureHITL(args as any);
          return {
            content: [{ type: 'text', text: 'HITL circuit breaker configuration updated successfully.' }],
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
