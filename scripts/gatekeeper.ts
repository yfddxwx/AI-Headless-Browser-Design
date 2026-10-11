import { execSync } from 'child_process';

interface GateStep {
  name: string;
  role: string;
  command: string;
  required: boolean;
}

const STEPS: GateStep[] = [
  {
    name: 'TypeScript 架构契约与类型静态检查',
    role: '🏛️ 系统架构师 (Architect)',
    command: 'npx tsc --noEmit',
    required: true,
  },
  {
    name: '单元测试覆盖与算法确定性验证',
    role: '🧠 AI 协议与感知工程师 (Protocol Dev)',
    command: 'npx vitest run tests/unit',
    required: true,
  },
  {
    name: '浏览器会话与交互原语功能验证',
    role: '⚙️ 核心引擎工程师 (Core Engine Dev)',
    command: 'npx vitest run tests/functional',
    required: true,
  },
  {
    name: '端到端综合集成流水线检查',
    role: '🧪 质检门禁工程师 (QA Gatekeeper)',
    command: 'npx vitest run tests/integration',
    required: true,
  },
  {
    name: 'SSRF 拦截与间接提示词注入红队安全审计',
    role: '🛡️ 安全与沙箱工程师 (Security Engineer)',
    command: 'npx vitest run tests/security',
    required: true,
  },
];

function runGatekeeper() {
  console.log('======================================================================');
  console.log('🚀 AI 原生无头浏览器团队闭环质量门禁 (Team Quality Gatekeeper)');
  console.log('======================================================================\n');

  let allPassed = true;
  const results: { step: string; role: string; status: 'PASSED' | 'FAILED'; output?: string }[] = [];

  for (const step of STEPS) {
    console.log(`▶ 正在执行 [${step.role}] 检查项: ${step.name}...`);
    try {
      const output = execSync(step.command, { encoding: 'utf-8', stdio: 'pipe' });
      console.log(`  ✅ 通过 (PASS)\n`);
      results.push({ step: step.name, role: step.role, status: 'PASSED' });
    } catch (err: any) {
      console.error(`  ❌ 失败 (FAIL):`);
      const errorOutput = err.stdout || err.stderr || err.message;
      console.error(errorOutput.slice(0, 500));
      results.push({ step: step.name, role: step.role, status: 'FAILED', output: errorOutput });
      allPassed = false;
      break;
    }
  }

  console.log('======================================================================');
  console.log('📊 团队门禁评审总览 (Team Gatekeeper Report)');
  console.log('======================================================================');
  for (const res of results) {
    const symbol = res.status === 'PASSED' ? '🟢' : '🔴';
    console.log(`${symbol} [${res.status}] ${res.role} - ${res.step}`);
  }
  console.log('======================================================================');

  if (allPassed) {
    console.log('\n🎉 恭喜！所有功能、单元、集成和安全检查均已通过。当前 Feature 已正式验收通过！\n');
    process.exit(0);
  } else {
    console.error('\n🚨 检查未通过，请对应责任工程师修复问题后再次触发门禁循环。\n');
    process.exit(1);
  }
}

runGatekeeper();
