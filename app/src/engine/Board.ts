import { BoardSize, Cell, Color, Group, Point, SUPPORTED_SIZES } from './types';

export const key = (p: Point) => `${p.x},${p.y}`;

/** 不可变棋盘：所有修改返回新 Board */
export class Board {
  readonly size: number;
  readonly cells: ReadonlyArray<Cell>;
  constructor(size: BoardSize | number, cells?: Cell[]) {
    if (!SUPPORTED_SIZES.includes(size as BoardSize)) throw new Error(`Unsupported board size: ${size}`);
    this.size = size;
    this.cells = cells ? cells.slice() : new Array(size * size).fill(null);
  }
  inBounds(p: Point) { return p.x >= 0 && p.y >= 0 && p.x < this.size && p.y < this.size; }
  get(p: Point): Cell { return this.cells[p.y * this.size + p.x]; }
  set(p: Point, c: Cell): Board { const a = this.cells.slice(); a[p.y * this.size + p.x] = c; return new Board(this.size, a); }
  neighbors(p: Point): Point[] {
    return [{ x: p.x - 1, y: p.y }, { x: p.x + 1, y: p.y }, { x: p.x, y: p.y - 1 }, { x: p.x, y: p.y + 1 }].filter(q => this.inBounds(q));
  }
  /** 取包含 p 的连通块（p 为空时返回 null） */
  groupAt(p: Point): Group | null {
    const color = this.get(p);
    if (!color) return null;
    const seen = new Set([key(p)]), libs = new Map<string, Point>(), stones: Point[] = [], stack = [p];
    while (stack.length) {
      const cur = stack.pop()!; stones.push(cur);
      for (const n of this.neighbors(cur)) {
        const c = this.get(n), k = key(n);
        if (c === null) libs.set(k, n);
        else if (c === color && !seen.has(k)) { seen.add(k); stack.push(n); }
      }
    }
    return { color, stones, liberties: [...libs.values()] };
  }
  allGroups(color?: Color): Group[] {
    const seen = new Set<string>(), out: Group[] = [];
    for (let y = 0; y < this.size; y++) for (let x = 0; x < this.size; x++) {
      const p = { x, y };
      if (seen.has(key(p)) || !this.get(p) || (color && this.get(p) !== color)) continue;
      const g = this.groupAt(p)!; g.stones.forEach(s => seen.add(key(s))); out.push(g);
    }
    return out;
  }
  hash(): string { return this.cells.map(c => (c === 'black' ? 'b' : c === 'white' ? 'w' : '.')).join(''); }
  static fromStrings(rows: string[]): Board {
    const b = new Board(rows.length);
    const cells = rows.flatMap(r => r.replace(/\s/g, '').split('').map(ch => (ch === 'X' ? 'black' : ch === 'O' ? 'white' : null))) as Cell[];
    return new Board(rows.length, cells);
  }
}
