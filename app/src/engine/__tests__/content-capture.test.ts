declare const require: any;
declare const __dirname: string;
const fs = require('fs');
const path = require('path');

interface LessonJson {
  captureTarget?: number | null;
  segments: Array<Record<string, unknown>>;
}

const DIR = path.resolve(__dirname, '../../../../content');
const days = Array.from({ length: 28 }, (_, i) => i + 1);
const load = (d: number): LessonJson =>
  JSON.parse(fs.readFileSync(path.join(DIR, `day${String(d).padStart(2, '0')}.json`), 'utf8'));

function readCaptureTarget(lesson: LessonJson): number | null {
  const g = lesson.segments.find((s) => s.type === 'game' && s.win === 'first_capture');
  return g && typeof g.captureTarget === 'number' ? g.captureTarget : null;
}

const expectedCaptureTarget = (day: number) => (day < 14 || day > 23 ? null : day <= 16 ? 1 : 3);

describe('课程 captureTarget', () => {
  test.each(days.filter((d) => d <= 14))('day%i 与裁定一致', (d) => {
    expect(readCaptureTarget(load(d))).toBe(expectedCaptureTarget(d));
  });

  test('D14 吃子棋先吃 1 子', () => {
    const g = load(14).segments.find((s) => s.type === 'game');
    expect([g?.win, g?.captureTarget]).toEqual(['first_capture', 1]);
  });

  test.each(days.filter((d) => d >= 15 && d <= 23))('day%i 恰有 1 段吃子棋且目标符合', (d) => {
    const segs = load(d).segments.filter((s) => s.type === 'game' && s.win === 'first_capture');
    expect(segs).toHaveLength(1);
    expect(readCaptureTarget(load(d))).toBe(expectedCaptureTarget(d));
    expect(segs[0].durationSec as number).toBeLessThanOrEqual(180);
  });

  test.each([24, 25, 26, 27, 28])('day%i 数子对局 captureTarget 为 null', (d) => {
    const lesson = load(d);
    expect(lesson.captureTarget).toBeNull();
    expect(readCaptureTarget(lesson)).toBeNull();
    const g = lesson.segments.find((s) => s.type === 'game') as { win?: string; endRules?: { passEnabled?: boolean } };
    expect(g.win).toBe('score');
    expect(g.endRules?.passEnabled).toBe(false);
  });
});
