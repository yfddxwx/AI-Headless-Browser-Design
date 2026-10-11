import { PagePerception } from '../types/index.js';

export class StateDiff {
  public static computeSummary(before: PagePerception, after: PagePerception): string {
    const changes: string[] = [];

    if (before.url !== after.url) {
      changes.push(`URL 跳转: "${before.url}" -> "${after.url}"`);
    }

    if (before.title !== after.title) {
      changes.push(`标题变更: "${before.title}" -> "${after.title}"`);
    }

    const beforeRefs = new Set(before.interactiveElements.map(e => e.ref));
    const afterRefs = new Set(after.interactiveElements.map(e => e.ref));

    const addedElements = after.interactiveElements.filter(e => !beforeRefs.has(e.ref));
    const removedCount = before.interactiveElements.filter(e => !afterRefs.has(e.ref)).length;

    if (addedElements.length > 0) {
      changes.push(`新增交互元素 (${addedElements.length} 个): ${addedElements.slice(0, 3).map(e => `${e.ref}[${e.text || e.name || e.tag}]`).join(', ')}${addedElements.length > 3 ? '...' : ''}`);
    }

    if (removedCount > 0) {
      changes.push(`移除旧交互元素: ${removedCount} 个`);
    }

    if (changes.length === 0) {
      return '页面状态未发生明显结构变化（可能触发了内部异步请求或局部更新）。';
    }

    return changes.join(' | ');
  }
}
