export type Color = 'red' | 'black';

export type Coord = { row: number; col: number };

export type Move = { from: Coord; to: Coord };

export type CellTint = 'black' | 'red' | 'neutral';

export type Piece = {
  id: string;
  color: Color;
  row: number;
  col: number;
};

export type GameMode = 'local' | 'ai';

export const BOARD_SIZE = 5;
export const WIN_LENGTH = 4;

export function coordKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function sameCoord(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
}

export function opposite(color: Color): Color {
  return color === 'red' ? 'black' : 'red';
}
