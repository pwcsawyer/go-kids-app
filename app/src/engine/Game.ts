import { Board, key } from './Board';
import { isGameOver, isLegal, play as playMove } from './rules';
import { scoreChinese, type ScoreOptions } from './score';
import {
  BoardSize,
  Color,
  Group,
  LegalityResult,
  Move,
  Point,
  ScoreResult,
  opponent,
} from './types';

interface Snapshot {
  board: Board;
  toPlay: Color;
  koPoint: Point | null;
  captures: Record<Color, number>;
  moveNumber: number;
  manualEnd: boolean;
}

export interface GameOptions {
  komi?: number;
  toPlay?: Color;
  board?: Board;
  /** 已下完的手数。非法着不计，提子不额外计。 */
  moveNumber?: number;
  koPoint?: Point | null;
  captures?: Record<Color, number>;
}

/** 有状态的外层封装。规则判断都交给纯函数。v1 没有虚手。 */
export class Game {
  board: Board;
  toPlay: Color;
  komi: number;
  koPoint: Point | null;
  captures: Record<Color, number>;
  /** 成功落子的次数。到达路数上限后对局结束。 */
  moveNumber: number;
  moves: Move[] = [];
  private manualEnd = false;
  private history: Snapshot[] = [];

  constructor(size: BoardSize = 9, opts: GameOptions = {}) {
    this.board = opts.board ?? new Board(size);
    this.toPlay = opts.toPlay ?? 'black';
    this.komi = opts.komi ?? 0;
    this.koPoint = opts.koPoint ?? null;
    this.captures = opts.captures ? { ...opts.captures } : { black: 0, white: 0 };
    this.moveNumber = opts.moveNumber ?? 0;
  }

  private overInfo() {
    return isGameOver({
      board: this.board,
      toPlay: this.toPlay,
      koPoint: this.koPoint,
      moveNumber: this.moveNumber,
    });
  }

  get isOver() {
    return this.manualEnd || this.overInfo().over;
  }

  isLegalMove(p: Point, color: Color = this.toPlay): LegalityResult {
    if (this.isOver) return { legal: false, reason: 'game_over' };
    return isLegal(this.board, { color, point: p }, color === this.toPlay ? this.koPoint : null);
  }

  isGameOver() {
    if (this.manualEnd) return { over: true as const, reason: undefined };
    return this.overInfo();
  }

  private snap(): Snapshot {
    return {
      board: this.board,
      toPlay: this.toPlay,
      koPoint: this.koPoint,
      captures: { ...this.captures },
      moveNumber: this.moveNumber,
      manualEnd: this.manualEnd,
    };
  }

  play(p: Point): LegalityResult & { captured?: Point[] } {
    if (this.isOver) return { legal: false, reason: 'game_over' };
    const color = this.toPlay;
    const result = playMove(this.board, { color, point: p }, this.koPoint);
    if (!result.legal) return { legal: false, reason: result.reason };
    this.history.push(this.snap());
    const captured = result.captured;
    this.board = result.board;
    this.koPoint = result.koPoint;
    this.captures = { ...this.captures, [color]: this.captures[color] + captured.length };
    this.moveNumber += 1;
    this.moves.push({ type: 'play', color, point: p, captured });
    this.toPlay = opponent(color);
    return { legal: true, captured };
  }

  /** 悔棋。手数减 1，不少于 0；终局状态一起恢复。 */
  undo(): boolean {
    const prev = this.history.pop();
    if (!prev) return false;
    this.board = prev.board;
    this.toPlay = prev.toPlay;
    this.koPoint = prev.koPoint;
    this.captures = prev.captures;
    this.moveNumber = prev.moveNumber;
    this.manualEnd = prev.manualEnd;
    this.moves.pop();
    return true;
  }

  /** 家长门后的“结束对局”。立刻可数子；下一手 play 返回 game_over。 */
  endGame(): ScoreResult {
    this.manualEnd = true;
    return this.score();
  }

  getGroup(p: Point): Group | null {
    return this.board.groupAt(p);
  }

  getLiberties(p: Point): Point[] {
    return this.board.groupAt(p)?.liberties ?? [];
  }

  isInAtari(group: Group | Point): boolean {
    const g = 'stones' in group ? this.board.groupAt(group.stones[0]) : this.board.groupAt(group);
    return !!g && g.liberties.length === 1;
  }

  findCaptureMoves(color: Color = this.toPlay): { point: Point; captureCount: number }[] {
    const res = new Map<string, { point: Point; captureCount: number }>();
    const ko = color === this.toPlay ? this.koPoint : null;
    for (const g of this.board.allGroups(opponent(color))) {
      if (g.liberties.length !== 1) continue;
      const p = g.liberties[0];
      const sim = playMove(this.board, { color, point: p }, ko);
      if (sim.legal && sim.captured.length) {
        res.set(key(p), { point: p, captureCount: sim.captured.length });
      }
    }
    return [...res.values()].sort((a, b) => b.captureCount - a.captureCount);
  }

  findGroupsInAtari(color: Color): Group[] {
    return this.board.allGroups(color).filter((g) => g.liberties.length === 1);
  }

  score(opts: ScoreOptions = {}): ScoreResult {
    return scoreChinese(this.board, {
      komi: opts.komi ?? this.komi,
      deadStones: opts.deadStones,
    });
  }
}
