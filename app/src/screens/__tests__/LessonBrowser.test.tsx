import { render, screen, userEvent } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import {
  captureTargetOf,
  endRulesOf,
  loadLessons,
  practiceLevels,
} from '../../content/loadLessons';
import { LessonBrowser } from '../LessonBrowser';

jest.mock('../../content/loadLessons', () => {
  const actual = jest.requireActual('../../content/loadLessons');
  const fs = require('fs');
  const path = require('path');
  const dir = path.resolve(process.cwd(), '../content');
  const lessons = fs
    .readdirSync(dir)
    .filter((name: string) => /^day\d{2}\.json$/.test(name))
    .sort()
    .map((name: string) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
  return { ...actual, loadLessons: () => lessons };
});

function setWindow(width: number, height: number) {
  Dimensions.set({
    window: { width, height, scale: 2, fontScale: 1 },
    screen: { width, height, scale: 2, fontScale: 1 },
  });
}

describe('关卡从 JSON 读取', () => {
  beforeEach(() => setWindow(1180, 820));

  test('28 节课、167 个练习关，吃子目标和终局规则来自文件', () => {
    const lessons = loadLessons();
    expect(lessons).toHaveLength(28);
    expect(lessons.reduce((sum, lesson) => sum + practiceLevels(lesson).length, 0)).toBe(167);
    const day14 = lessons.find((lesson) => lesson.day === 14);
    const day24 = lessons.find((lesson) => lesson.day === 24);
    expect(day14 && captureTargetOf(day14)).toBe(1);
    expect(day24 && captureTargetOf(day24)).toBeNull();
    expect(day24 && endRulesOf(day24)?.moveLimit).toEqual({ '5': 40, '7': 80, '9': 120 });
    expect(day24 && endRulesOf(day24)?.passEnabled).toBe(false);
  });

  test('列表显示课程名，点开练习关能看到 JSON 里的棋盘', async () => {
    const lesson = loadLessons().find((item) => item.day === 4)!;
    const level = practiceLevels(lesson)[0];
    await render(<LessonBrowser initialItemId={level.id} />);
    expect(screen.getByText(`4. ${lesson.title}`)).toBeTruthy();
    expect(screen.getAllByText(level.prompt?.text ?? level.id).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId(/^point-\d+-\d+$/)).toHaveLength(level.boardSize * level.boardSize);
    const stones = level.board.flatMap((row, y) =>
      row.split('').flatMap((cell, x) => (cell === 'X' ? [`黑子 ${x},${y}`] : cell === 'O' ? [`白子 ${x},${y}`] : [])),
    );
    expect(screen.getByLabelText(stones[0])).toBeTruthy();
  });

  test('对局关的手数上限和吃子目标跟着 JSON', async () => {
    await render(<LessonBrowser />);
    const user = userEvent.setup();
    await user.press(screen.getByTestId('level-day24-game'));
    expect(screen.getByTestId('end-rules').props.children).toContain('40');
    expect(screen.getByTestId('end-rules').props.children).toContain('不能虚手');
    await user.press(screen.getByTestId('level-day14-game'));
    expect(screen.getByTestId('capture-target').props.children).toBe('先吃到 1 颗');
    expect(screen.getByTestId('capture-rules').props.children).toContain('没有可下的地方就输了');
  });
});
