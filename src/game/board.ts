import {
  BOARD_SIZE,
  type CellTint,
  type Color,
  type Coord,
  type Piece,
  coordKey,
} from './types';

/** Official start: red on black squares, black on red squares (row 0 = top). */
export const RED_START: Coord[] = [
  { row: 0, col: 0 },
  { row: 0, col: 2 },
  { row: 0, col: 4 },
  { row: 2, col: 0 },
  { row: 4, col: 1 },
  { row: 4, col: 3 },
];

export const BLACK_START: Coord[] = [
  { row: 0, col: 1 },
  { row: 0, col: 3 },
  { row: 2, col: 4 },
  { row: 4, col: 0 },
  { row: 4, col: 2 },
  { row: 4, col: 4 },
];

const TINT_MAP: Record<string, CellTint> = {};
for (const c of RED_START) TINT_MAP[coordKey(c.row, c.col)] = 'black';
for (const c of BLACK_START) TINT_MAP[coordKey(c.row, c.col)] = 'red';

export function cellTint(row: number, col: number): CellTint {
  return TINT_MAP[coordKey(row, col)] ?? 'neutral';
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function createInitialPieces(): Piece[] {
  const pieces: Piece[] = [];
  RED_START.forEach((c, i) => {
    pieces.push({ id: `red-${i}`, color: 'red', row: c.row, col: c.col });
  });
  BLACK_START.forEach((c, i) => {
    pieces.push({ id: `black-${i}`, color: 'black', row: c.row, col: c.col });
  });
  return pieces;
}

export function occupancyMap(pieces: readonly Piece[]): Map<string, Piece> {
  const map = new Map<string, Piece>();
  for (const p of pieces) {
    map.set(coordKey(p.row, p.col), p);
  }
  return map;
}

export function pieceAt(
  pieces: readonly Piece[],
  row: number,
  col: number,
): Piece | undefined {
  return occupancyMap(pieces).get(coordKey(row, col));
}

export function piecesOfColor(pieces: readonly Piece[], color: Color): Piece[] {
  return pieces.filter((p) => p.color === color);
}
