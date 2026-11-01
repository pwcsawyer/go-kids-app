import { Board, key } from './Board';
import { Point, ScoreResult } from './types';

/** 死子列表不合法：越界、空点，或某一块只标了一部分。 */
export class InvalidDeadStones extends Error {
  constructor(message = '死子列表不合法') {
    super(message);
    this.name = 'InvalidDeadStones';
  }
}

export interface ScoreOptions {
  komi?: number;
  deadStones?: Point[];
}

function assertDeadStones(board: Board, dead: Point[]) {
  const seen = new Set<string>();
  const unique: Point[] = [];
  for (const p of dead) {
    if (!board.inBounds(p)) throw new InvalidDeadStones('死子坐标越界');
    const id = key(p);
    if (seen.has(id)) continue;
    seen.add(id);
    if (board.get(p) == null) throw new InvalidDeadStones('死子列表含空点');
    unique.push(p);
  }
  for (const p of unique) {
    const group = board.groupAt(p);
    if (!group) throw new InvalidDeadStones('死子列表含空点');
    for (const stone of group.stones) {
      if (!seen.has(key(stone))) throw new InvalidDeadStones('死子必须整块标出');
    }
  }
}

function areaScore(b: Board, komi: number): ScoreResult {
  let bs = 0;
  let ws = 0;
  let bt = 0;
  let wt = 0;
  const seen = new Set<string>();
  for (let y = 0; y < b.size; y++) {
    for (let x = 0; x < b.size; x++) {
      const p = { x, y };
      const c = b.get(p);
      if (c === 'black') bs++;
      else if (c === 'white') ws++;
      else if (!seen.has(key(p))) {
        const region: Point[] = [];
        const borders = new Set<string>();
        const stack = [p];
        seen.add(key(p));
        while (stack.length) {
          const cur = stack.pop()!;
          region.push(cur);
          for (const n of b.neighbors(cur)) {
            const nc = b.get(n);
            if (nc) borders.add(nc);
            else if (!seen.has(key(n))) {
              seen.add(key(n));
              stack.push(n);
            }
          }
        }
        if (borders.size === 1) {
          if (borders.has('black')) bt += region.length;
          else wt += region.length;
        }
      }
    }
  }
  const black = bs + bt;
  const white = ws + wt + komi;
  const delta = black - white;
  return {
    black,
    white,
    blackStones: bs,
    whiteStones: ws,
    blackTerritory: bt,
    whiteTerritory: wt,
    komi,
    winner: delta > 0 ? 'black' : delta < 0 ? 'white' : 'draw',
    margin: Math.abs(delta),
  };
}

/**
 * 中国规则面积计分。deadStones 先按块校验，再整块移走，然后数子 + 只被一方围住的空。
 * 不把死子再加进提子（避免和空点重复计算）。
 */
export function scoreChinese(board: Board, opts: ScoreOptions = {}): ScoreResult {
  const komi = opts.komi ?? 0;
  const dead = opts.deadStones ?? [];
  if (dead.length === 0) return areaScore(board, komi);
  assertDeadStones(board, dead);
  const seen = new Set<string>();
  let next = board;
  for (const p of dead) {
    const id = key(p);
    if (seen.has(id)) continue;
    seen.add(id);
    if (next.inBounds(p) && next.get(p)) next = next.set(p, null);
  }
  return areaScore(next, komi);
}
