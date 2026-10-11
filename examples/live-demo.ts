import { BrowserManager } from '../src/core/browser-manager.js';
import * as fs from 'fs';
import * as path from 'path';

async function runLiveBattleTest() {
  console.log('======================================================================');
  console.log('🚀 AgentBrowser (NoHead-AI) 实战推演：AI 大模型原生无头浏览器');
  console.log('======================================================================\n');

  // 1. 初始化具备高隐蔽指纹掩盖与网络加速护盾的浏览器实例
  const browserManager = new BrowserManager({
    headless: true,
    stealth: true,
    networkShield: {
      enabled: true,
      blockAnalytics: true,
      blockMedia: false,
    },
    hitl: {
      enabled: true,
      autoBreakOnCaptcha: true,
    },
  });

  const session = await browserManager.createSession();
  console.log('🟢 [SessionContext] 浏览器会话已成功建立 (Chromium Stealth Mode 激活)\n');

  try {
    // -------------------------------------------------------------
    // 实战阶段 1: 真实公网目标导航、SSRF 防护与 Token 极限压缩
    // -------------------------------------------------------------
    const targetUrl = 'https://news.ycombinator.com';
    console.log(`▶ [阶段 1] 正在安全导航至目标站点: ${targetUrl}...`);

    const perception = await session.navigate(targetUrl);

    console.log(`  ✅ 导航完成！页面标题: "${perception.title}"`);
    console.log(`  📊 原始 HTML 字符长度: ${perception.rawHtmlLength.toLocaleString()} 字符`);
    console.log(`  📊 压缩后 Markdown 长度: ${perception.compressedLength.toLocaleString()} 字符`);
    console.log(`  ⚡ Token 节省率: ${perception.compressionRatio}% (预估 Token 开销: ~${perception.tokensEstimated} tokens)`);
    console.log(`  🎯 提取到交互元素总数: ${perception.interactiveElements.length} 个（全量注入 @Ref 确定性句柄）\n`);

    console.log('--- [AI 视口感知 Markdown 样例 (前 600 字符)] ---');
    console.log(perception.compressedMarkdown.slice(0, 600) + '...\n');

    console.log('--- [前 5 个交互式元素句柄 (@Ref)] ---');
    for (const el of perception.interactiveElements.slice(0, 5)) {
      console.log(`  • ${el.ref} [${el.tag.toUpperCase()}] "${el.text || el.name || 'N/A'}" -> ${el.href || el.selector}`);
    }
    console.log('\n');

    // -------------------------------------------------------------
    // 实战阶段 2: 模式驱动强类型结构化数据提取 (Feature 06: Stagehand 级能力)
    // -------------------------------------------------------------
    console.log('▶ [阶段 2] 执行 Schema-Driven 强类型结构化数据提取...');
    const itemSchema = {
      type: 'array',
      items: {
        title: 'string',
        link: 'string',
      },
    };

    const extracted = await session.extractData(itemSchema, { maxItems: 5 });
    console.log(`  ✅ 结构化抽取完成！`);
    console.log(`  🏷️ 抽取源: ${extracted.source} | 置信度: ${extracted.confidence} | 条目数: ${extracted.itemCount}`);
    console.log(`  🛡️ 提示词注入告警: ${extracted.securityNotices ? extracted.securityNotices.length : '0 (Safe)'}`);
    console.log('  📦 提取出的强类型数据预览:');
    console.log(JSON.stringify(extracted.data, null, 2));
    console.log('\n');

    // -------------------------------------------------------------
    // 实战阶段 3: 确定性 @Ref 动作执行与状态变更差分 (StateDiff)
    // -------------------------------------------------------------
    console.log('▶ [阶段 3] 执行确定性 @Ref 点击动作与状态差分分析...');
    // 查找 "new" / "newest" 导航链接
    const newestLink = perception.interactiveElements.find(
      (el) => el.text.trim().toLowerCase() === 'new' || el.href?.includes('newest')
    );

    if (newestLink) {
      console.log(`  🖱️ 目标点击元素: ${newestLink.ref} ("${newestLink.text}")`);
      const actionResult = await session.click(newestLink.ref);
      console.log(`  ✅ 点击执行成功: ${actionResult.success}`);
      console.log(`  🌐 URL 变更: "${actionResult.urlBefore}" -> "${actionResult.urlAfter}"`);
      console.log(`  📑 标题变更: "${actionResult.titleBefore}" -> "${actionResult.titleAfter}"`);
      console.log(`  🔄 状态差分摘要 (StateDiff):`);
      console.log(`     ${actionResult.diffSummary || '无明显结构变动'}\n`);
    }

    // -------------------------------------------------------------
    // 实战阶段 4: 多模态视觉打标快照 (Set-of-Mark Visual Grounding)
    // -------------------------------------------------------------
    console.log('▶ [阶段 4] 生成多模态 Set-of-Mark (SOM) 视觉标注快照...');
    const visualSnapshot = await session.getVisualSnapshot({
      boxColor: '#2563EB',
      textColor: '#FFFFFF',
      fontSize: 12,
    });

    console.log(`  ✅ 视觉快照捕获成功！`);
    console.log(`  📐 视口尺寸: ${visualSnapshot.viewport.width} x ${visualSnapshot.viewport.height}`);
    console.log(`  🏷️ SOM 标定元素数: ${visualSnapshot.totalAnnotatedCount} 个`);

    // 保存标注截图至本地供查看
    const screenshotBuffer = Buffer.from(visualSnapshot.annotatedScreenshotBase64, 'base64');
    const outPath = path.resolve(process.cwd(), 'examples/som-live-snapshot.png');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, screenshotBuffer);
    console.log(`  🖼️ 视觉 SOM 标注截图已持久化至: ${outPath} (${(screenshotBuffer.length / 1024).toFixed(1)} KB)\n`);

    // -------------------------------------------------------------
    // 实战阶段 5: 会话凭证保险箱 (SessionVault) 导出与持久化
    // -------------------------------------------------------------
    console.log('▶ [阶段 5] 导出全要素状态保险箱 (Cookies / LocalStorage)...');
    const vault = await session.exportVault();
    console.log(`  ✅ 状态保险箱提取完成！`);
    console.log(`  🍪 保存 Cookies 数: ${vault.cookies.length}`);
    console.log(`  💾 保存 Storage 域名作用域数: ${vault.origins.length}\n`);

    // -------------------------------------------------------------
    // 实战阶段 6: 网络护盾遥测与流量拦截统计 (NetworkShield)
    // -------------------------------------------------------------
    console.log('▶ [阶段 6] 获取网络加速护盾拦截统计...');
    const networkStats = session.getNetworkStats();
    console.log(`  🛡️ 拦截统计: 总请求 ${networkStats.totalRequests} | 拦截广告/分析脚本 ${networkStats.blockedRequests}`);
    if (networkStats.blockedResources.length > 0) {
      console.log(`  🚫 被拦截的追踪源样例: ${networkStats.blockedResources.slice(0, 3).join(', ')}`);
    }
    console.log('\n');

    console.log('======================================================================');
    console.log('🎉 实战推演圆满成功！AgentBrowser 8 大核心子系统协同运转完美！');
    console.log('======================================================================\n');
  } catch (error: any) {
    console.error('❌ 实战推演遇到异常:', error.message);
  } finally {
    await session.close();
    await browserManager.close();
    console.log('🏁 浏览器会话与 Chromium 进程已安全优雅关闭。');
  }
}

runLiveBattleTest().catch(console.error);
