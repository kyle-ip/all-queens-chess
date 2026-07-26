import { allLegalMoves } from '../game/moves';
import { hasWin, countRunsOfLength } from '../game/win';
import { opposite, type Color, type Move, type Piece } from '../game/types';

export type AiDifficulty = 'easy' | 'normal' | 'hard';

const WIN = 100_000;
const DEPTH: Record<AiDifficulty, number> = {
  easy: 0,
  normal: 1,
  hard: 3,
};

function applyHypothetical(
  pieces: readonly Piece[],
  move: Move,
): Piece[] {
  return pieces.map((p) => {
    if (p.row === move.from.row && p.col === move.from.col) {
      return { ...p, row: move.to.row, col: move.to.col };
    }
    return p;
  });
}

function centerBonus(row: number, col: number): number {
  return 4 - (Math.abs(row - 2) + Math.abs(col - 2));
}

function evaluate(pieces: readonly Piece[], side: Color): number {
  const opp = opposite(side);
  if (hasWin(pieces, side)) return WIN;
  if (hasWin(pieces, opp)) return -WIN;

  let score = 0;
  score += countRunsOfLength(pieces, side, 3) * 900;
  score += countRunsOfLength(pieces, side, 2) * 55;
  score -= countRunsOfLength(pieces, opp, 3) * 950;
  score -= countRunsOfLength(pieces, opp, 2) * 50;

  for (const p of pieces) {
    const bonus = centerBonus(p.row, p.col);
    score += p.color === side ? bonus * 4 : -bonus * 3;
  }

  score += allLegalMoves(pieces, side).length * 0.8;
  score -= allLegalMoves(pieces, opp).length * 0.6;
  return score;
}

function winningMoves(
  pieces: readonly Piece[],
  side: Color,
): Move[] {
  return allLegalMoves(pieces, side).filter((m) =>
    hasWin(applyHypothetical(pieces, m), side),
  );
}

function blockingMoves(
  pieces: readonly Piece[],
  side: Color,
): Move[] {
  const opp = opposite(side);
  const threats = winningMoves(pieces, opp);
  if (threats.length === 0) return [];

  // Squares we must occupy to deny at least one immediate win
  const mustCover = new Set(threats.map((m) => `${m.to.row},${m.to.col}`));
  return allLegalMoves(pieces, side).filter((m) =>
    mustCover.has(`${m.to.row},${m.to.col}`),
  );
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Easy: take wins; sometimes miss blocks; otherwise random. */
function chooseEasy(pieces: readonly Piece[], side: Color): Move | null {
  const moves = allLegalMoves(pieces, side);
  if (moves.length === 0) return null;

  const wins = winningMoves(pieces, side);
  if (wins.length) return pickRandom(wins);

  const blocks = blockingMoves(pieces, side);
  if (blocks.length && Math.random() < 0.45) {
    return pickRandom(blocks);
  }

  return pickRandom(moves);
}

function minimax(
  pieces: Piece[],
  sideToMove: Color,
  rootSide: Color,
  depth: number,
  alpha: number,
  beta: number,
): number {
  if (depth === 0) return evaluate(pieces, rootSide);

  const moves = shuffle(allLegalMoves(pieces, sideToMove));
  if (moves.length === 0) return evaluate(pieces, rootSide);

  const maximizing = sideToMove === rootSide;
  let best = maximizing ? -Infinity : Infinity;

  for (const move of moves) {
    const next = applyHypothetical(pieces, move);
    if (hasWin(next, sideToMove)) {
      // Prefer quicker wins / slower losses via depth residual
      const terminal =
        sideToMove === rootSide ? WIN + depth : -WIN - depth;
      if (maximizing) best = Math.max(best, terminal);
      else best = Math.min(best, terminal);
    } else {
      const score = minimax(
        next,
        opposite(sideToMove),
        rootSide,
        depth - 1,
        alpha,
        beta,
      );
      if (maximizing) best = Math.max(best, score);
      else best = Math.min(best, score);
    }

    if (maximizing) alpha = Math.max(alpha, best);
    else beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }

  return best;
}

function chooseSearch(
  pieces: readonly Piece[],
  side: Color,
  depth: number,
): Move | null {
  const moves = shuffle(allLegalMoves(pieces, side));
  if (moves.length === 0) return null;

  // Always seize an immediate win
  const wins = winningMoves(pieces, side);
  if (wins.length) return pickRandom(wins);

  let best = moves[0]!;
  let bestScore = -Infinity;

  for (const move of moves) {
    const next = applyHypothetical(pieces, move);
    let score: number;
    if (hasWin(next, side)) {
      score = WIN;
    } else {
      score = minimax(
        next,
        opposite(side),
        side,
        depth - 1,
        -Infinity,
        Infinity,
      );
    }
    // Tiny noise so equal lines vary
    score += Math.random() * 0.01;
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }

  return best;
}

/** Thinking delay (ms) so harder levels feel more deliberate. */
export function aiThinkDelay(difficulty: AiDifficulty): number {
  switch (difficulty) {
    case 'easy':
      return 220;
    case 'normal':
      return 420;
    case 'hard':
      return 700;
  }
}

export function chooseAiMove(
  pieces: readonly Piece[],
  side: Color,
  difficulty: AiDifficulty = 'normal',
): Move | null {
  if (difficulty === 'easy') return chooseEasy(pieces, side);
  return chooseSearch(pieces, side, DEPTH[difficulty]);
}
