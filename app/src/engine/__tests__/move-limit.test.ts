import { Board, Game, isGameOver, opponent, play } from '..';
import type { Color, Point } from '..';

declare const require: any;
declare const __dirname: string;
const fs = require('fs');
const path = require('path');

interface FixtureMove {
  color: Color;
  x: number;
  y: number;
}

interface Fixture {
  size: 5;
  toPlay: Color;
  board: string[];
  moves: FixtureMove[];
}

const fixturePath = path.join(__dirname, 'fixtures/5x5-move-limit.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as Fixture;

describe('5 路 40 手棋谱夹具', () => {
  test('文件里的每一步都合法，双方都有提子，下满 40 手触发 move_limit', () => {
    expect(fixture.moves).toHaveLength(40);
    let board = Board.fromStrings(fixture.board);
    let ko: Point | null = null;
    let color: Color = fixture.toPlay;
    let blackCaptured = 0;
    let whiteCaptured = 0;
    fixture.moves.forEach((step, index) => {
      const result = play(board, { color: step.color, point: { x: step.x, y: step.y } }, ko);
      expect(result.legal).toBe(true);
      if (!result.legal) return;
      if (step.color === 'black') blackCaptured += result.captured.length;
      else whiteCaptured += result.captured.length;
      board = result.board;
      ko = result.koPoint;
      color = opponent(step.color);
      const info = isGameOver({ board, toPlay: color, koPoint: ko, moveNumber: index + 1 });
      if (index + 1 < 40) expect(info.over).toBe(false);
      else expect(info).toEqual({ over: true, reason: 'move_limit' });
    });
    expect(blackCaptured).toBeGreaterThan(0);
    expect(whiteCaptured).toBeGreaterThan(0);
  });

  test('Game.moveNumber 到 40 后 play 返回 game_over，悔棋后恢复未结束', () => {
    const game = new Game(fixture.size, {
      board: Board.fromStrings(fixture.board),
      toPlay: fixture.toPlay,
    });
    for (const step of fixture.moves) {
      const result = game.play({ x: step.x, y: step.y });
      expect(result.legal).toBe(true);
    }
    expect(game.moveNumber).toBe(40);
    expect(game.isOver).toBe(true);
    expect(game.isGameOver()).toEqual({ over: true, reason: 'move_limit' });
    const extra = game.play({ x: 0, y: 0 });
    expect(extra).toEqual({ legal: false, reason: 'game_over' });
    expect(game.moveNumber).toBe(40);

    expect(game.undo()).toBe(true);
    expect(game.moveNumber).toBe(39);
    expect(game.isOver).toBe(false);
    expect(game.isGameOver().over).toBe(false);
  });
});
