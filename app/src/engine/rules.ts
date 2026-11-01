import { Board } from './Board';
import {
  BoardSize,
  Color,
  LegalityResult,
  Point,
  opponent,
} from './types';

/** 纯函数着手：颜色 + 交叉点。不修改入参棋盘。 */
export interface PlayMove {
  color: Color;
  point: Point;
}

export interface PlayOk {
  legal: true;
  board: Board;
  captured: Point[];
  koPoint: Point | null;
}

export interface PlayNg {
  legal: false;
  reason: NonNullable<LegalityResult['reason']>;
}

export type PlayResult = PlayOk | PlayNg;

/** 5 / 7 / 9 路手数上限。第 N 手落下并处理完提子后对局结束。 */
export const MOVE_LIMITS: Partial<Record<BoardSize, number>> = {
  5: 40,
  7: 80,
  9: 120,
};

export interface GameOverState {
  board: Board;
  toPlay: Color;
  koPoint: Point | null;
  moveNumber: number;
}

export interface GameOverInfo {
  over: boolean;
  reason?: 'only_true_eyes' | 'move_limit';
}

export interface CaptureGameState {
  board: Board;
  toPlay: Color;
  koPoint: Point | null;
  captures: Record<Color, number>;
}

export interface CaptureGameResult {
  over: boolean;
  winner?: Color;
  reason?: 'target' | 'no_legal_move';
}

/**
 * 落子。koPoint 为当前禁止立即回提的点；不传则没有劫禁。
 * 不检查对局是否已经结束（手数上限 / 只剩真眼由 isGameOver 判断）。
 */
export function play(board: Board, move: PlayMove, koPoint: Point | null = null): PlayResult {
  const { color, point: p } = move;
  if (!board.inBounds(p)) return { legal: false, reason: 'out_of_bounds' };
  if (board.get(p)) return { legal: false, reason: 'occupied' };
  if (koPoint && koPoint.x === p.x && koPoint.y === p.y) return { legal: false, reason: 'ko' };

  let nb = board.set(p, color);
  const captured: Point[] = [];
  for (const n of nb.neighbors(p)) {
    if (nb.get(n) !== opponent(color)) continue;
    const g = nb.groupAt(n);
    if (!g || g.liberties.length > 0) continue;
    for (const s of g.stones) {
      if (nb.get(s)) {
        captured.push(s);
        nb = nb.set(s, null);
      }
    }
  }
  const self = nb.groupAt(p);
  if (!self || self.liberties.length === 0) return { legal: false, reason: 'suicide' };
  const newKo =
    captured.length === 1 && self.stones.length === 1 && self.liberties.length === 1 ? captured[0] : null;
  return { legal: true, board: nb, captured, koPoint: newKo };
}

export function isLegal(board: Board, move: PlayMove, koPoint: Point | null = null): LegalityResult {
  const result = play(board, move, koPoint);
  return result.legal ? { legal: true } : { legal: false, reason: result.reason };
}

/** 该点所在棋块的气；空点返回 [] */
export function liberties(board: Board, p: Point): Point[] {
  return board.groupAt(p)?.liberties ?? [];
}

/** 这手棋会提掉哪些子；不合法返回 [] */
export function captures(board: Board, move: PlayMove, koPoint: Point | null = null): Point[] {
  const result = play(board, move, koPoint);
  return result.legal ? result.captured : [];
}

/** color 方全部合法着点，按行优先 */
export function legalMoves(board: Board, color: Color, koPoint: Point | null = null): Point[] {
  const out: Point[] = [];
  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      const point = { x, y };
      if (isLegal(board, { color, point }, koPoint).legal) out.push(point);
    }
  }
  return out;
}

export function hasLegalMove(board: Board, color: Color, koPoint: Point | null = null): boolean {
  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      if (isLegal(board, { color, point: { x, y } }, koPoint).legal) return true;
    }
  }
  return false;
}

/**
 * 单点真眼：正交邻居都是己方（棋盘边当墙）；
 * 斜向：角上 1 个必须是己方，边上至少 1 个，中腹至少 3 个。空点算没占住。
 */
export function isTrueEye(board: Board, p: Point, color: Color): boolean {
  if (!board.inBounds(p) || board.get(p) !== null) return false;
  const orthogonal = [
    { x: p.x - 1, y: p.y },
    { x: p.x + 1, y: p.y },
    { x: p.x, y: p.y - 1 },
    { x: p.x, y: p.y + 1 },
  ];
  for (const n of orthogonal) {
    if (!board.inBounds(n)) continue;
    if (board.get(n) !== color) return false;
  }
  const diagonals = [
    { x: p.x - 1, y: p.y - 1 },
    { x: p.x + 1, y: p.y - 1 },
    { x: p.x - 1, y: p.y + 1 },
    { x: p.x + 1, y: p.y + 1 },
  ].filter((d) => board.inBounds(d));
  const bad = diagonals.filter((d) => board.get(d) !== color).length;
  // 角上 1 个、边上 2 个斜角都必须是己方；中腹 4 个里至少 3 个。空点和对方的子都不算。
  if (diagonals.length <= 2) return bad === 0;
  return bad <= 1;
}

function onlyOwnTrueEyesLeft(board: Board, color: Color, koPoint: Point | null): boolean {
  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      const point = { x, y };
      if (!isLegal(board, { color, point }, koPoint).legal) continue;
      if (!isTrueEye(board, point, color)) return false;
    }
  }
  return true;
}

/** 数子对局是否结束。手数达到上限优先于“只剩填真眼”。 */
export function isGameOver(state: GameOverState): GameOverInfo {
  const limit = MOVE_LIMITS[state.board.size as BoardSize];
  if (limit != null && state.moveNumber >= limit) return { over: true, reason: 'move_limit' };
  if (onlyOwnTrueEyesLeft(state.board, state.toPlay, state.koPoint)) {
    return { over: true, reason: 'only_true_eyes' };
  }
  return { over: false };
}

/** 吃子棋：先提满 captureTarget 者胜；轮到的一方没有合法点则负。 */
export function captureGameResult(s: CaptureGameState, captureTarget: number): CaptureGameResult {
  if (s.captures.black >= captureTarget) return { over: true, winner: 'black', reason: 'target' };
  if (s.captures.white >= captureTarget) return { over: true, winner: 'white', reason: 'target' };
  if (!hasLegalMove(s.board, s.toPlay, s.koPoint)) {
    return { over: true, winner: opponent(s.toPlay), reason: 'no_legal_move' };
  }
  return { over: false };
}
