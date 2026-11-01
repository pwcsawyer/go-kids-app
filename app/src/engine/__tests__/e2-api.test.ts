import { Board } from '..';
import {
  captureGameResult,
  hasLegalMove,
  isGameOver,
  isTrueEye,
  legalMoves,
  scoreChinese,
  type Point,
} from '..';

const P = (x: number, y: number): Point => ({ x, y });
const B = (rows: string[]) => Board.fromStrings(rows);

describe('isGameOver｜只剩填真眼', () => {
  const over = (rows: string[], toPlay: 'black' | 'white' = 'black', moveNumber = 0) =>
    isGameOver({ board: B(rows), toPlay, koPoint: null, moveNumber });

  test('黑只剩自己两个真眼 → only_true_eyes', () => {
    expect(over(['.X.XO', 'XXXXO', 'OOOOO', 'O.O.O', 'OOOOO'])).toEqual({
      over: true,
      reason: 'only_true_eyes',
    });
  });

  test('还有可下的公共点 → 未结束', () => {
    expect(over(['.X.X.', 'XXXX.', '.....', '.....', '.....']).over).toBe(false);
  });

  test('假眼不算真眼 → 未结束', () => {
    expect(over(['.XO..', 'X.X..', '.XO..', '.....', '.....']).over).toBe(false);
  });

  test('角上真眼斜角缺一个就不是真眼', () => {
    expect(isTrueEye(B(['.X...', 'XX...', '.....', '.....', '.....']), P(0, 0), 'black')).toBe(true);
    expect(isTrueEye(B(['.X...', 'X....', '.....', '.....', '.....']), P(0, 0), 'black')).toBe(false);
    expect(isTrueEye(B(['.X...', 'XO...', '.....', '.....', '.....']), P(0, 0), 'black')).toBe(false);
  });
});

describe('手数上限', () => {
  test.each([
    [5, 40],
    [7, 80],
    [9, 120],
  ] as const)('%i 路第 %i 手之后结束', (size, limit) => {
    const board = new Board(size);
    expect(isGameOver({ board, toPlay: 'black', koPoint: null, moveNumber: limit - 1 }).over).toBe(false);
    expect(isGameOver({ board, toPlay: 'black', koPoint: null, moveNumber: limit })).toEqual({
      over: true,
      reason: 'move_limit',
    });
  });

  test('达到上限时优先报 move_limit', () => {
    const board = B(['.X.XO', 'XXXXO', 'OOOOO', 'O.O.O', 'OOOOO']);
    expect(isGameOver({ board, toPlay: 'black', koPoint: null, moveNumber: 40 }).reason).toBe('move_limit');
  });
});

describe('hasLegalMove / legalMoves', () => {
  const noMove = B(['.OOOO', 'OOOOO', 'OO.OO', 'OOOOO', 'OOOO.']);

  test('黑方无合法点', () => {
    expect(legalMoves(noMove, 'black')).toEqual([]);
    expect(hasLegalMove(noMove, 'black')).toBe(false);
  });

  test('白方仍可下（填自己的眼）', () => {
    expect(legalMoves(noMove, 'white')).toHaveLength(3);
    expect(hasLegalMove(noMove, 'white')).toBe(true);
  });

  test('初始 5 路空盘 25 个合法点', () => {
    expect(legalMoves(B(['.....', '.....', '.....', '.....', '.....']), 'black')).toHaveLength(25);
  });
});

describe('captureGameResult', () => {
  const empty = B(['.....', '.....', '.....', '.....', '.....']);
  const noMove = B(['.OOOO', 'OOOOO', 'OO.OO', 'OOOOO', 'OOOO.']);
  const st = (
    cap: [number, number],
    toPlay: 'black' | 'white' = 'black',
    board = empty,
    koPoint: Point | null = null,
  ) => ({ board, toPlay, koPoint, captures: { black: cap[0], white: cap[1] } });

  test('目标 1：黑提 1 子 → 黑胜', () => {
    expect(captureGameResult(st([1, 0]), 1)).toEqual({ over: true, winner: 'black', reason: 'target' });
  });
  test('目标 1：0:0 未结束', () => {
    expect(captureGameResult(st([0, 0]), 1).over).toBe(false);
  });
  test('目标 3：2 子未结束', () => {
    expect(captureGameResult(st([2, 0]), 3).over).toBe(false);
  });
  test('目标 3：白提满 3 → 白胜', () => {
    expect(captureGameResult(st([2, 3]), 3).winner).toBe('white');
  });
  test('目标 3：一手多提超过目标仍判胜', () => {
    expect(captureGameResult(st([4, 0]), 3).winner).toBe('black');
  });
  test('轮到黑但无合法点 → 黑负', () => {
    expect(captureGameResult(st([0, 0], 'black', noMove), 3)).toEqual({
      over: true,
      winner: 'white',
      reason: 'no_legal_move',
    });
  });
  test('轮到白、白有合法点 → 未结束', () => {
    expect(captureGameResult(st([0, 0], 'white', noMove), 3).over).toBe(false);
  });
  test('劫禁着不算合法点：唯一空点被劫禁 → 判负', () => {
    const board = B(['X.OXX', 'XXXXX', 'XXXXX', 'XXXXX', 'XXXXX']);
    expect(hasLegalMove(board, 'black', null)).toBe(true);
    expect(hasLegalMove(board, 'black', P(1, 0))).toBe(false);
    expect(
      captureGameResult({ board, toPlay: 'black', koPoint: P(1, 0), captures: { black: 0, white: 0 } }, 3),
    ).toEqual({ over: true, winner: 'white', reason: 'no_legal_move' });
  });
});

describe('scoreChinese', () => {
  const cases = [
    { rows: ['.X.O.', '.X.O.', '.X.O.', '.X.O.', '.X.O.'], black: 10, white: 10 },
    { rows: ['.X...', 'XX...', '.....', '...OO', '...O.'], black: 4, white: 4 },
    { rows: ['..X..', '..X..', '..X..', '..X..', '..X..'], black: 25, white: 0 },
  ];

  test.each(cases.map((c, i) => [i, c] as const))('无死子局面 %i', (_i, c) => {
    const s = scoreChinese(B(c.rows), { komi: 0 });
    expect([s.black, s.white]).toEqual([c.black, c.white]);
  });

  test('空棋盘 0:0 和棋', () => {
    expect(scoreChinese(new Board(5)).winner).toBe('draw');
  });

  test('贴目计入白方', () => {
    const s = scoreChinese(B(cases[0].rows), { komi: 0.5 });
    expect([s.white, s.winner]).toEqual([10.5, 'white']);
  });

  test('不传 deadStones 与传 [] 结果一致', () => {
    expect(scoreChinese(B(cases[1].rows), { deadStones: [] })).toEqual(scoreChinese(B(cases[1].rows)));
  });

  test('margin 正确', () => {
    expect(scoreChinese(B(cases[2].rows)).margin).toBe(25);
  });

  const dead = [
    { rows: ['OX.O.', '.X.O.', '.X.O.', '.X.O.', '.X.O.'], dead: [P(0, 0)], black: 10, white: 10 },
    { rows: ['.X.O.', '.X.OX', '.X.OX', '.X.O.', '.X.O.'], dead: [P(4, 1), P(4, 2)], black: 10, white: 10 },
    { rows: ['OX.OX', '.X.O.', '.X.O.', '.X.O.', '.X.O.'], dead: [P(0, 0), P(4, 0)], black: 10, white: 10 },
    { rows: ['O.X..', '..X..', '.OX..', '..X.O', '..X..'], dead: [P(0, 0), P(1, 2), P(4, 3)], black: 25, white: 0 },
    { rows: ['.XO..', 'XX...', '.....', '...OO', '...O.'], dead: [P(2, 0)], black: 4, white: 4 },
  ];

  test.each(dead.map((d, i) => [i, d] as const))('移除死子后面 %i', (_i, d) => {
    const s = scoreChinese(B(d.rows), { komi: 0, deadStones: d.dead });
    expect([s.black, s.white]).toEqual([d.black, d.white]);
  });

  const base = ['OX.O.', '.X.O.', '.X.O.', '.X.O.', '.X.O.'];
  const bad: [string, string[], Point[]][] = [
    ['含 1 个空点', base, [P(2, 0)]],
    ['死子 + 空点混合', base, [P(0, 0), P(2, 2)]],
    ['全是空点', base, [P(2, 0), P(2, 1)]],
    ['越界坐标', base, [P(5, 0)]],
    ['一块两子只标 1 子', ['OO...', 'XXX..', '.....', '.....', '.....'], [P(0, 0)]],
    ['一块三子漏标 1 子', ['OOO..', 'XXXX.', '.....', '.....', '.....'], [P(0, 0), P(1, 0)]],
  ];

  test.each(bad)('%s → 抛 InvalidDeadStones', (_n, rows, stones) => {
    expect(() => scoreChinese(B(rows), { deadStones: stones })).toThrow(
      expect.objectContaining({ name: 'InvalidDeadStones' }),
    );
  });

  test('整块完整标出不抛错', () => {
    expect(() =>
      scoreChinese(B(['OO...', 'XXX..', '.....', '.....', '.....']), { deadStones: [P(0, 0), P(1, 0)] }),
    ).not.toThrow();
  });

  test('重复坐标视为同一子，不抛错', () => {
    expect(() => scoreChinese(B(base), { deadStones: [P(0, 0), P(0, 0)] })).not.toThrow();
  });
});
