import { Board, Game, scoreChinese, SUPPORTED_SIZES } from '..';
const P = (x: number, y: number) => ({ x, y });
const fromRows = (rows: string[], toPlay: 'black' | 'white' = 'black', komi = 0) =>
  new Game(rows.length as any, { board: Board.fromStrings(rows), toPlay, komi });

describe('棋盘', () => {
  test.each(SUPPORTED_SIZES)('支持 %i 路', s => { expect(new Game(s).board.size).toBe(s); });
  test('不支持的尺寸抛错', () => { expect(() => new Board(8)).toThrow(); });
  test('越界落子', () => { expect(new Game(5).isLegalMove(P(5, 0))).toEqual({ legal: false, reason: 'out_of_bounds' }); });
});

describe('气', () => {
  const g = new Game(9);
  g.play(P(0, 0)); g.play(P(8, 8)); g.play(P(4, 4)); g.play(P(0, 4));
  test('角上 2 气', () => expect(g.getLiberties(P(0, 0))).toHaveLength(2));
  test('边上 3 气', () => expect(g.getLiberties(P(0, 4))).toHaveLength(3));
  test('中腹 4 气', () => expect(g.getLiberties(P(4, 4))).toHaveLength(4));
  test('空点无气', () => expect(g.getLiberties(P(2, 2))).toEqual([]));
  test('连通块共享气', () => {
    const h = fromRows(['XX...', '.....', '.....', '.....', '.....']);
    const gr = h.getGroup(P(0, 0))!;
    expect(gr.stones).toHaveLength(2); expect(gr.liberties).toHaveLength(3);
  });
  test('气不重复计数', () => {
    const h = fromRows(['.....', '.X.X.', '.....', '.....', '.....']);
    expect(h.getLiberties(P(1, 1))).toHaveLength(4);
  });
});

describe('落子与提子', () => {
  test('占用', () => { const g = new Game(5); g.play(P(2, 2)); expect(g.isLegalMove(P(2, 2))).toEqual({ legal: false, reason: 'occupied' }); });
  test('交替落子', () => { const g = new Game(5); g.play(P(0, 0)); expect(g.toPlay).toBe('white'); });
  test('角上提一子', () => {
    const g = fromRows(['OX...', '.....', '.....', '.....', '.....']);
    const r = g.play(P(0, 1));
    expect(r.captured).toEqual([P(0, 0)]); expect(g.board.get(P(0, 0))).toBeNull(); expect(g.captures.black).toBe(1);
  });
  test('多子提子', () => {
    const g = fromRows(['XOOX.', '.XX..', '.....', '.....', '.....']);
    expect(g.play(P(4, 4)).captured).toEqual([]);
    const g2 = fromRows(['XOOOX', '.XXX.', '.....', '.....', '.....']);
    expect(g2.isInAtari(P(1, 0))).toBe(false);
    const g3 = fromRows(['.OOOX', 'XXXX.', '.....', '.....', '.....']);
    expect(g3.play(P(0, 0)).captured).toHaveLength(3); expect(g3.captures.black).toBe(3);
  });
  test('同时提两块', () => {
    const k = fromRows(['XO.OX', '.X.X.', '.....', '.....', '.....']);
    const r = k.play(P(2, 0));
    expect(r.captured).toHaveLength(2); expect(k.captures.black).toBe(2); expect(k.koPoint).toBeNull();
  });
});

describe('禁入点（自杀）', () => {
  test('单子自杀', () => {
    const g = fromRows(['.X...', 'X....', '.....', '.....', '.....'], 'white');
    expect(g.isLegalMove(P(0, 0))).toEqual({ legal: false, reason: 'suicide' });
    expect(g.play(P(0, 0)).legal).toBe(false); expect(g.board.get(P(0, 0))).toBeNull();
  });
  test('多子自杀', () => {
    const g = fromRows(['O.X..', 'XX...', '.....', '.....', '.....'], 'white');
    expect(g.isLegalMove(P(1, 0)).reason).toBe('suicide');
  });
  test('提子后非自杀', () => {
    const g = fromRows(['.XO..', 'XO...', 'O....', '.....', '.....'], 'white');
    expect(g.isLegalMove(P(0, 0))).toEqual({ legal: true });
    expect(g.play(P(0, 0)).captured).toHaveLength(2);
  });
  test('己方连通后有气则合法', () => {
    const g = fromRows(['.X...', 'XX...', '.....', '.....', '.....']);
    expect(g.isLegalMove(P(0, 0)).legal).toBe(true);
  });
});

describe('劫', () => {
  const ko = () => fromRows(['.XO..', 'X.XO.', '.XO..', '.....', '.....'], 'white');
  test('不能立即回提', () => {
    const g = ko();
    expect(g.play(P(1, 1)).captured).toEqual([P(2, 1)]);
    expect(g.koPoint).toEqual(P(2, 1));
    expect(g.isLegalMove(P(2, 1))).toEqual({ legal: false, reason: 'ko' });
  });
  test('找劫后可以回提', () => {
    const g = ko(); g.play(P(1, 1)); g.play(P(4, 4)); g.play(P(4, 3));
    expect(g.isLegalMove(P(2, 1)).legal).toBe(true);
    expect(g.play(P(2, 1)).captured).toEqual([P(1, 1)]);
  });
  test('在别处落子解除劫', () => { const g = ko(); g.play(P(1, 1)); g.play(P(4, 4)); expect(g.koPoint).toBeNull(); });
});

describe('悔棋与手数', () => {
  test('悔棋恢复提子与计数', () => {
    const g = fromRows(['OX...', '.....', '.....', '.....', '.....']);
    g.play(P(0, 1)); expect(g.undo()).toBe(true);
    expect(g.board.get(P(0, 0))).toBe('white'); expect(g.board.get(P(0, 1))).toBeNull();
    expect(g.captures.black).toBe(0); expect(g.toPlay).toBe('black'); expect(g.moves).toHaveLength(0);
  });
  test('悔棋恢复劫状态', () => {
    const g = fromRows(['.XO..', 'X.XO.', '.XO..', '.....', '.....'], 'white');
    g.play(P(1, 1)); g.play(P(4, 4)); g.undo(); expect(g.koPoint).toEqual(P(2, 1));
  });
  test('空历史悔棋手数保持 0', () => { const g = new Game(5); expect(g.undo()).toBe(false); expect(g.moveNumber).toBe(0); });
  test('历史只记落子，一手只加 1', () => {
    const g = new Game(5); g.play(P(1, 1)); g.play(P(2, 2));
    expect(g.moves.map(m => m.type)).toEqual(['play', 'play']);
    expect(g.moveNumber).toBe(2);
    g.undo();
    expect(g.moveNumber).toBe(1);
  });
  test('非法着不计手数', () => {
    const g = new Game(5); g.play(P(0, 0));
    expect(g.play(P(0, 0)).reason).toBe('occupied');
    expect(g.moveNumber).toBe(1);
  });
  test('提子不额外计手数', () => {
    const g = fromRows(['OX...', '.....', '.....', '.....', '.....']);
    expect(g.play(P(0, 1)).captured).toHaveLength(1);
    expect(g.moveNumber).toBe(1);
  });
});

describe('儿童关卡辅助', () => {
  test('isInAtari', () => {
    const g = fromRows(['OX...', '.....', '.....', '.....', '.....']);
    expect(g.isInAtari(P(0, 0))).toBe(true); expect(g.isInAtari(g.getGroup(P(0, 0))!)).toBe(true);
    expect(g.isInAtari(P(1, 0))).toBe(false); expect(g.isInAtari(P(3, 3))).toBe(false);
  });
  test('findCaptureMoves 按吃子数排序', () => {
    const g = fromRows(['OX...', '.....', '..X..', '.XOOX', '..XX.']);
    expect(g.findCaptureMoves('black')).toEqual([{ point: P(3, 2), captureCount: 2 }, { point: P(0, 1), captureCount: 1 }]);
  });
  test('findCaptureMoves 无可吃', () => expect(new Game(5).findCaptureMoves()).toEqual([]));
  test('findCaptureMoves 排除劫禁点', () => {
    const g = fromRows(['.XO..', 'X.XO.', '.XO..', '.....', '.....'], 'white');
    g.play(P(1, 1));
    expect(g.findCaptureMoves('black').some(m => m.point.x === 2 && m.point.y === 1)).toBe(false);
  });
  test('findGroupsInAtari（救猫咪）', () => {
    const g = fromRows(['XO...', '.....', '.....', '.....', '.....']);
    expect(g.findGroupsInAtari('black')).toHaveLength(1);
  });
});

describe('计分（中国规则）', () => {
  test('空棋盘和棋', () => { const s = new Game(5).score(); expect(s.winner).toBe('draw'); expect(s.black).toBe(0); });
  test('单子占全盘', () => { const g = new Game(5); g.play(P(2, 2)); expect(g.score().black).toBe(25); });
  test('分界线 + 贴目', () => {
    const b = Board.fromStrings(['.XO..', '.XO..', '.XO..', '.XO..', '.XO..']);
    const s = scoreChinese(b, { komi: 0 });
    expect(s.black).toBe(10); expect(s.white).toBe(15); expect(s.winner).toBe('white');
    const s2 = scoreChinese(Board.fromStrings(['..XO.', '..XO.', '..XO.', '..XO.', '..XO.']), { komi: 2.5 });
    expect(s2.black).toBe(15); expect(s2.white).toBe(12.5); expect(s2.winner).toBe('black'); expect(s2.margin).toBe(2.5);
  });
  test('双方相邻的空不计', () => {
    const s = scoreChinese(Board.fromStrings(['X.O..', 'X.O..', 'X.O..', 'X.O..', 'X.O..']));
    expect(s.blackTerritory).toBe(0); expect(s.whiteTerritory).toBe(10);
  });
});
