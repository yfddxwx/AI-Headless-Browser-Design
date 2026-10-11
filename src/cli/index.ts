import { AgentRunner } from '../agent/agent-runner.js';
import { AgentRunOptions } from '../agent/types.js';

export function parseCliArgs(args: string[]): {
  command?: string;
  instruction?: string;
  options: Partial<AgentRunOptions>;
  showHelp: boolean;
  showVersion: boolean;
} {
  const options: Partial<AgentRunOptions> = {
    headless: true,
    verbose: true,
    maxSteps: 15,
  };

  let command: string | undefined;
  let instruction: string | undefined;
  let showHelp = false;
  let showVersion = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      showHelp = true;
    } else if (arg === '--version' || arg === '-v') {
      showVersion = true;
    } else if (arg === '--url' && i + 1 < args.length) {
      options.startUrl = args[++i];
    } else if (arg === '--max-steps' && i + 1 < args.length) {
      options.maxSteps = parseInt(args[++i], 10) || 15;
    } else if (arg === '--model' && i + 1 < args.length) {
      options.model = args[++i];
    } else if (arg === '--api-key' && i + 1 < args.length) {
      options.apiKey = args[++i];
    } else if (arg === '--base-url' && i + 1 < args.length) {
      options.baseUrl = args[++i];
    } else if (arg === '--no-headless' || arg === '--headful') {
      options.headless = false;
    } else if (arg === '--quiet' || arg === '-q') {
      options.verbose = false;
    } else if (!command) {
      command = arg;
    } else if (!instruction) {
      instruction = arg;
    }
  }

  return { command, instruction, options, showHelp, showVersion };
}

export function printHelp(): void {
  console.log(`
======================================================================
🚀 AgentBrowser (NoHead-AI) Autonomous CLI
======================================================================

Usage:
  agent-browser <command> [arguments] [options]

Commands:
  run <instruction>      Execute a natural language task autonomously

Options:
  --url <url>            Initial URL to open
  --max-steps <number>   Maximum steps budget (default: 15)
  --model <name>         Model to use (default: gpt-4o-mini or env AGENT_MODEL)
  --api-key <key>        OpenAI-compatible API key (or env OPENAI_API_KEY)
  --base-url <url>       OpenAI-compatible API base URL (default: https://api.openai.com/v1)
  --no-headless          Run browser in visible UI mode
  --quiet, -q            Only print the final result
  -v, --version          Show version
  -h, --help             Show this help message

Examples:
  agent-browser run "Find the top trending project on GitHub" --url "https://github.com/trending"
  agent-browser run "Check weather in Tokyo" --model "deepseek-chat"
`);
}

export async function runCli(argv: string[]): Promise<void> {
  const { command, instruction, options, showHelp, showVersion } = parseCliArgs(argv);

  if (showVersion) {
    console.log('@yfddxwx/ai-headless-browser v0.1.0');
    return;
  }

  if (showHelp || !command) {
    printHelp();
    return;
  }

  if (command === 'run') {
    if (!instruction) {
      console.error('❌ Error: Missing natural language instruction for "run" command.');
      console.error('Usage: agent-browser run "<instruction>" [options]');
      process.exit(1);
    }

    console.log('======================================================================');
    console.log('🚀 AgentBrowser 自主智能体启动 (Autonomous Web Agent)');
    console.log(`🎯 任务指令: "${instruction}"`);
    if (options.startUrl) console.log(`🌐 起始网址: ${options.startUrl}`);
    console.log('======================================================================\n');

    const result = await AgentRunner.run({
      instruction,
      ...options,
    });

    console.log('\n======================================================================');
    if (result.success) {
      console.log('🎉 [任务完成] 智能体成功达成目标！');
      console.log(`⏱️ 总耗时: ${(result.totalDurationMs / 1000).toFixed(2)} 秒 | 步数: ${result.totalSteps}`);
      console.log(`⚡ 累计预估 Token 节省: ~${result.tokensEstimated.toLocaleString()} tokens`);
      console.log('\n📦 最终输出 / 结果:');
      console.log(result.finalAnswer);
    } else {
      console.log('⚠️ [任务未完全达成] 智能体在预算内未得出明确结论或遇到异常:');
      console.log(result.finalAnswer);
      if (result.error) console.log(`错误详情: ${result.error}`);
    }
    console.log('======================================================================\n');
  } else {
    console.error(`❌ Unknown command: "${command}". Run "agent-browser --help" for available commands.`);
    process.exit(1);
  }
}
