import type { EndRules, GameSegment, Lesson, LessonLevel } from './types';

/** 关卡只来自 content/day01.json–day28.json，不在代码里写局面。 */
export function loadLessons(): Lesson[] {
  // 必须写成 require.context(...)，Metro 才会在打包时收进这些 JSON。
  const ctx = require.context('../../../content', false, /^\.\/day\d{2}\.json$/);
  return ctx
    .keys()
    .slice()
    .sort()
    .map((key: string) => ctx(key) as Lesson);
}

export function practiceLevels(lesson: Lesson): LessonLevel[] {
  return lesson.segments.filter((segment) => segment.type === 'practice').flatMap((segment) => segment.levels ?? []);
}

export function gameSegment(lesson: Lesson): GameSegment | null {
  const segment = lesson.segments.find((item) => item.type === 'game');
  if (!segment || typeof segment.boardSize !== 'number') return null;
  return segment as GameSegment;
}

/** game 段上的 captureTarget 优先，否则用课程顶层。没有这个数字就是数子局。 */
export function captureTargetOf(lesson: Lesson): number | null {
  const game = lesson.segments.find((segment) => segment.type === 'game');
  if (game && Object.prototype.hasOwnProperty.call(game, 'captureTarget')) {
    return typeof game.captureTarget === 'number' ? game.captureTarget : null;
  }
  return typeof lesson.captureTarget === 'number' ? lesson.captureTarget : null;
}

export function endRulesOf(lesson: Lesson): EndRules | null {
  const game = gameSegment(lesson);
  return game?.endRules ?? null;
}

export function ruleLines(lesson: Lesson): string[] {
  const lines: string[] = [];
  const game = gameSegment(lesson);
  const target = captureTargetOf(lesson);
  if (game?.win === 'first_capture') {
    lines.push(target == null ? '吃子棋' : `先吃到 ${target} 颗`);
    if (game.noLegalMoveLoses) lines.push('没有可下的地方就输了');
  }
  const rules = endRulesOf(lesson);
  if (!rules) return lines;
  if (rules.passEnabled === false) lines.push('不能虚手');
  if (rules.autoEndWhenOnlyOwnTrueEyes) lines.push('只剩填真眼就数子');
  if (rules.moveLimit) {
    const parts = Object.keys(rules.moveLimit)
      .sort((a, b) => Number(a) - Number(b))
      .map((size) => `${size}路 ${rules.moveLimit?.[size]} 手`);
    lines.push(`手数上限 ${parts.join('，')}`);
  }
  if (rules.scoring) lines.push(`计分 ${rules.scoring}`);
  if (typeof rules.komi === 'number') lines.push(`贴目 ${rules.komi}`);
  return lines;
}
