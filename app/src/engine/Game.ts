import { Board, key } from './Board';
import { BoardSize, Color, Group, LegalityResult, Move, Point, ScoreResult, opponent } from './types';

interface Snapshot { board: Board; toPlay: Color; koPoint: Point | null; captures: Record<Color, number>; consecutivePasses: number; move: Move | null }

export interface GameOptions { komi?: number; toPlay?: Color; board?: Board }

export class Game {
  board: Board;
  toPlay: Color;
  komi: number;
  /** 简单劫：当前禁止落子的点 */
  koPoint: Point | null = null;
  /** 吃子计数：captures.black = 黑方提掉的白子数 */
  captures: Record<Color, number> = { black: 0, white: 0 };
  consecutivePasses = 0;
  private history: Snapshot[] = [];
  moves: Move[] = [];

  constructor(size: BoardSize = 9, opts: GameOptions = {}) {
    this.board = opts.board ?? new Board(size);
    this.toPlay = opts.toPlay ?? 'black';
    this.komi = opts.komi ?? 0;
  }

  get isOver() { return this.consecutivePasses >= 2; }

  /** 试算落子，返回结果棋盘与提子；不合法返回原因 */
  private simulate(p: Point, color: Color): { result: LegalityResult; board?: Board; captured?: Point[] } {
    const b = this.board;
    if (!b.inBounds(p)) return { result: { legal: false, reason: 'out_of_bounds' } };
    if (b.get(p)) return { result: { legal: false, reason: 'occupied' } };
    if (this.koPoint && this.koPoint.x === p.x && this.koPoint.y === p.y && color === this.toPlay)
      return { result: { legal: false, reason: 'ko' } };
    let nb = b.set(p, color);
    const captured: Point[] = [];
    for (const n of nb.neighbors(p)) {
      if (nb.get(n) !== opponent(color)) continue;
      const g = nb.groupAt(n)!;
      if (g.liberties.length === 0) for (const s of g.stones) { if (nb.get(s)) { captured.push(s); nb = nb.set(s, null); } }
    }
    if (nb.groupAt(p)!.liberties.length === 0) return { result: { legal: false, reason: 'suicide' } };
    return { result: { legal: true }, board: nb, captured };
  }

  isLegalMove(p: Point, color: Color = this.toPlay): LegalityResult {
    if (this.isOver) return { legal: false, reason: 'game_over' };
    return this.simulate(p, color).result;
  }

  private snapshot(move: Move | null) {
    this.history.push({ board: this.board, toPlay: this.toPlay, koPoint: this.koPoint, captures: { ...this.captures }, consecutivePasses: this.consecutivePasses, move });
  }

  play(p: Point): LegalityResult & { captured?: Point[] } {
    const color = this.toPlay;
    if (this.isOver) return { legal: false, reason: 'game_over' };
    const sim = this.simulate(p, color);
    if (!sim.result.legal) return sim.result;
    this.snapshot(null);
    const captured = sim.captured!;
    this.board = sim.board!;
    this.captures[color] += captured.length;
    // 简单劫：单子提单子，且落下的子成为只有一口气的单子
    const g = this.board.groupAt(p)!;
    this.koPoint = captured.length === 1 && g.stones.length === 1 && g.liberties.length === 1 ? captured[0] : null;
    this.consecutivePasses = 0;
    const move: Move = { type: 'play', color, point: p, captured };
    this.moves.push(move);
    this.toPlay = opponent(color);
    return { legal: true, captured };
  }

  pass(): boolean {
    if (this.isOver) return false;
    this.snapshot(null);
    this.moves.push({ type: 'pass', color: this.toPlay });
    this.consecutivePasses++;
    this.koPoint = null;
    this.toPlay = opponent(this.toPlay);
    return true;
  }

  undo(): boolean {
    const s = this.history.pop();
    if (!s) return false;
    Object.assign(this, { board: s.board, toPlay: s.toPlay, koPoint: s.koPoint, captures: s.captures, consecutivePasses: s.consecutivePasses });
    this.moves.pop();
    return true;
  }

  // ---------- 儿童关卡辅助 ----------
  getGroup(p: Point): Group | null { return this.board.groupAt(p); }
  getLiberties(p: Point): Point[] { return this.board.groupAt(p)?.liberties ?? []; }
  isInAtari(group: Group | Point): boolean {
    const g = 'stones' in group ? this.board.groupAt(group.stones[0]) : this.board.groupAt(group);
    return !!g && g.liberties.length === 1;
  }
  /** color 方可以立即提子的合法着点（按吃子数降序） */
  findCaptureMoves(color: Color = this.toPlay): { point: Point; captureCount: number }[] {
    const res = new Map<string, { point: Point; captureCount: number }>();
    for (const g of this.board.allGroups(opponent(color))) {
      if (g.liberties.length !== 1) continue;
      const p = g.liberties[0];
      const sim = this.simulate(p, color);
      if (sim.result.legal && sim.captured!.length) res.set(key(p), { point: p, captureCount: sim.captured!.length });
    }
    return [...res.values()].sort((a, b) => b.captureCount - a.captureCount);
  }
  /** 被打吃的 color 方棋块（救猫咪题用） */
  findGroupsInAtari(color: Color): Group[] { return this.board.allGroups(color).filter(g => g.liberties.length === 1); }

  /** 中国规则面积计分：子 + 只被一方包围的空 */
  score(komi: number = this.komi): ScoreResult {
    return scoreBoard(this.board, komi);
  }
}

export function scoreBoard(b: Board, komi = 0): ScoreResult {
  let bs = 0, ws = 0, bt = 0, wt = 0;
  const seen = new Set<string>();
  for (let y = 0; y < b.size; y++) for (let x = 0; x < b.size; x++) {
    const p = { x, y }, c = b.get(p);
    if (c === 'black') bs++; else if (c === 'white') ws++;
    else if (!seen.has(key(p))) {
      const region: Point[] = [], borders = new Set<string>(), stack = [p]; seen.add(key(p));
      while (stack.length) {
        const cur = stack.pop()!; region.push(cur);
        for (const n of b.neighbors(cur)) {
          const nc = b.get(n);
          if (nc) borders.add(nc); else if (!seen.has(key(n))) { seen.add(key(n)); stack.push(n); }
        }
      }
      if (borders.size === 1) borders.has('black') ? (bt += region.length) : (wt += region.length);
    }
  }
  const black = bs + bt, white = ws + wt + komi, d = black - white;
  return { black, white, blackStones: bs, whiteStones: ws, blackTerritory: bt, whiteTerritory: wt, komi,
    winner: d > 0 ? 'black' : d < 0 ? 'white' : 'draw', margin: Math.abs(d) };
}
