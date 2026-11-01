export type Color = 'black' | 'white';
export type Cell = Color | null;
export type BoardSize = 5 | 7 | 9 | 13 | 19;
export const SUPPORTED_SIZES: BoardSize[] = [5, 7, 9, 13, 19];
export interface Point { x: number; y: number }
export type IllegalReason = 'occupied' | 'suicide' | 'ko' | 'out_of_bounds' | 'game_over';
export interface LegalityResult { legal: boolean; reason?: IllegalReason }
export interface Group { color: Color; stones: Point[]; liberties: Point[] }
export type Move =
  | { type: 'play'; color: Color; point: Point; captured: Point[] }
  | { type: 'pass'; color: Color };
export interface ScoreResult {
  black: number; white: number; blackStones: number; whiteStones: number;
  blackTerritory: number; whiteTerritory: number; komi: number;
  winner: Color | 'draw'; margin: number;
}
export const opponent = (c: Color): Color => (c === 'black' ? 'white' : 'black');
