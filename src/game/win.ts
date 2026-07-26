import { BOARD_SIZE, WIN_LENGTH, type Color, type Coord, type Piece } from './types';
import { piecesOfColor } from './board';

const LINE_DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal \
  [1, -1], // diagonal /
];

function occupancySet(pieces: readonly Piece[]): Set<string> {
  const set = new Set<string>();
  for (const p of pieces) set.add(`${p.row},${p.col}`);
  return set;
}

/**
 * Returns a winning line of at least WIN_LENGTH contiguous squares for `color`,
 * or null if none.
 */
export function findWinningLine(
  pieces: readonly Piece[],
  color: Color,
): Coord[] | null {
  const owned = occupancySet(piecesOfColor(pieces, color));

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (!owned.has(`${row},${col}`)) continue;

      for (const [dr, dc] of LINE_DIRS) {
        // Only start a ray at the "beginning" so we don't double-count
        const prevR = row - dr;
        const prevC = col - dc;
        if (
          prevR >= 0 &&
          prevR < BOARD_SIZE &&
          prevC >= 0 &&
          prevC < BOARD_SIZE &&
          owned.has(`${prevR},${prevC}`)
        ) {
          continue;
        }

        const line: Coord[] = [{ row, col }];
        let r = row + dr;
        let c = col + dc;
        while (
          r >= 0 &&
          r < BOARD_SIZE &&
          c >= 0 &&
          c < BOARD_SIZE &&
          owned.has(`${r},${c}`)
        ) {
          line.push({ row: r, col: c });
          r += dr;
          c += dc;
        }

        if (line.length >= WIN_LENGTH) return line;
      }
    }
  }
  return null;
}

export function hasWin(pieces: readonly Piece[], color: Color): boolean {
  return findWinningLine(pieces, color) !== null;
}

/** Count contiguous runs of `length` for heuristic scoring. */
export function countRunsOfLength(
  pieces: readonly Piece[],
  color: Color,
  length: number,
): number {
  const owned = occupancySet(piecesOfColor(pieces, color));
  let count = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (!owned.has(`${row},${col}`)) continue;
      for (const [dr, dc] of LINE_DIRS) {
        const prevR = row - dr;
        const prevC = col - dc;
        if (
          prevR >= 0 &&
          prevR < BOARD_SIZE &&
          prevC >= 0 &&
          prevC < BOARD_SIZE &&
          owned.has(`${prevR},${prevC}`)
        ) {
          continue;
        }
        let len = 1;
        let r = row + dr;
        let c = col + dc;
        while (
          r >= 0 &&
          r < BOARD_SIZE &&
          c >= 0 &&
          c < BOARD_SIZE &&
          owned.has(`${r},${c}`)
        ) {
          len++;
          r += dr;
          c += dc;
        }
        if (len === length) count++;
      }
    }
  }
  return count;
}
