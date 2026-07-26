import { inBounds, occupancyMap } from './board';
import { type Coord, type Piece, coordKey } from './types';

const QUEEN_DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

/** Legal destination squares for a queen (no jump, no capture). */
export function legalMovesFor(
  pieces: readonly Piece[],
  from: Coord,
): Coord[] {
  const occ = occupancyMap(pieces);
  if (!occ.has(coordKey(from.row, from.col))) return [];

  const targets: Coord[] = [];
  for (const [dr, dc] of QUEEN_DIRS) {
    let r = from.row + dr;
    let c = from.col + dc;
    while (inBounds(r, c)) {
      const key = coordKey(r, c);
      if (occ.has(key)) break;
      targets.push({ row: r, col: c });
      r += dr;
      c += dc;
    }
  }
  return targets;
}

export function isLegalMove(
  pieces: readonly Piece[],
  from: Coord,
  to: Coord,
): boolean {
  return legalMovesFor(pieces, from).some(
    (t) => t.row === to.row && t.col === to.col,
  );
}

export function allLegalMoves(
  pieces: readonly Piece[],
  color: Piece['color'],
): Array<{ from: Coord; to: Coord }> {
  const moves: Array<{ from: Coord; to: Coord }> = [];
  for (const p of pieces) {
    if (p.color !== color) continue;
    const from = { row: p.row, col: p.col };
    for (const to of legalMovesFor(pieces, from)) {
      moves.push({ from, to });
    }
  }
  return moves;
}
