import { createInitialPieces, pieceAt } from './board';
import { isLegalMove } from './moves';
import { findWinningLine } from './win';
import {
  opposite,
  sameCoord,
  type Color,
  type Coord,
  type GameMode,
  type Move,
  type Piece,
} from './types';

export type GamePhase = 'menu' | 'playing' | 'won';

export type GameSnapshot = {
  phase: GamePhase;
  mode: GameMode;
  pieces: Piece[];
  turn: Color;
  selected: Coord | null;
  winner: Color | null;
  winLine: Coord[] | null;
  humanColor: Color;
  firstPlayer: Color;
  moveCount: number;
  elapsedMs: number;
  canUndo: boolean;
};

type HistoryEntry = {
  pieces: Piece[];
  turn: Color;
  phase: GamePhase;
  winner: Color | null;
  winLine: Coord[] | null;
  moveCount: number;
};

export type GameListener = (state: GameSnapshot) => void;

export class GameState {
  private phase: GamePhase = 'menu';
  private mode: GameMode = 'local';
  private pieces: Piece[] = createInitialPieces();
  private turn: Color = 'red';
  private selected: Coord | null = null;
  private winner: Color | null = null;
  private winLine: Coord[] | null = null;
  private humanColor: Color = 'red';
  private firstPlayer: Color = 'red';
  private moveCount = 0;
  private startedAt: number | null = null;
  private finishedAt: number | null = null;
  private history: HistoryEntry[] = [];
  private listeners = new Set<GameListener>();

  subscribe(listener: GameListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): GameSnapshot {
    return {
      phase: this.phase,
      mode: this.mode,
      pieces: this.pieces.map((p) => ({ ...p })),
      turn: this.turn,
      selected: this.selected ? { ...this.selected } : null,
      winner: this.winner,
      winLine: this.winLine?.map((c) => ({ ...c })) ?? null,
      humanColor: this.humanColor,
      firstPlayer: this.firstPlayer,
      moveCount: this.moveCount,
      elapsedMs: this.elapsedMs(),
      canUndo: this.history.length > 0,
    };
  }

  private elapsedMs(): number {
    if (this.startedAt === null) return 0;
    const end = this.finishedAt ?? Date.now();
    return Math.max(0, end - this.startedAt);
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const l of this.listeners) l(snap);
  }

  private pushHistory(): void {
    this.history.push({
      pieces: this.pieces.map((p) => ({ ...p })),
      turn: this.turn,
      phase: this.phase,
      winner: this.winner,
      winLine: this.winLine?.map((c) => ({ ...c })) ?? null,
      moveCount: this.moveCount,
    });
  }

  startGame(opts: {
    mode: GameMode;
    firstPlayer: Color;
    humanColor?: Color;
  }): void {
    this.mode = opts.mode;
    this.firstPlayer = opts.firstPlayer;
    this.humanColor = opts.humanColor ?? 'red';
    this.pieces = createInitialPieces();
    this.turn = opts.firstPlayer;
    this.selected = null;
    this.winner = null;
    this.winLine = null;
    this.moveCount = 0;
    this.history = [];
    this.startedAt = Date.now();
    this.finishedAt = null;
    this.phase = 'playing';
    this.emit();
  }

  returnToMenu(): void {
    this.phase = 'menu';
    this.selected = null;
    this.winner = null;
    this.winLine = null;
    this.pieces = createInitialPieces();
    this.moveCount = 0;
    this.history = [];
    this.startedAt = null;
    this.finishedAt = null;
    this.emit();
  }

  selectSquare(row: number, col: number): Move | null {
    if (this.phase !== 'playing') return null;
    if (this.mode === 'ai' && this.turn !== this.humanColor) return null;

    const clicked = pieceAt(this.pieces, row, col);

    if (this.selected) {
      if (sameCoord(this.selected, { row, col })) {
        this.selected = null;
        this.emit();
        return null;
      }

      if (isLegalMove(this.pieces, this.selected, { row, col })) {
        const move = { from: { ...this.selected }, to: { row, col } };
        this.applyMove(move);
        return move;
      }

      if (clicked && clicked.color === this.turn) {
        this.selected = { row, col };
        this.emit();
        return null;
      }

      this.selected = null;
      this.emit();
      return null;
    }

    if (clicked && clicked.color === this.turn) {
      this.selected = { row, col };
      this.emit();
    }
    return null;
  }

  applyMove(move: Move): boolean {
    if (this.phase !== 'playing') return false;
    if (!isLegalMove(this.pieces, move.from, move.to)) return false;

    const piece = pieceAt(this.pieces, move.from.row, move.from.col);
    if (!piece || piece.color !== this.turn) return false;

    this.pushHistory();

    this.pieces = this.pieces.map((p) =>
      p.id === piece.id ? { ...p, row: move.to.row, col: move.to.col } : p,
    );
    this.selected = null;
    this.moveCount += 1;

    const line = findWinningLine(this.pieces, this.turn);
    if (line) {
      this.winner = this.turn;
      this.winLine = line;
      this.phase = 'won';
      this.finishedAt = Date.now();
      this.emit();
      return true;
    }

    this.turn = opposite(this.turn);
    this.emit();
    return true;
  }

  /** Apply a move without human-turn gating (for AI). */
  applyAiMove(move: Move): boolean {
    if (this.phase !== 'playing') return false;
    if (this.mode !== 'ai') return false;
    if (this.turn === this.humanColor) return false;
    return this.applyMove(move);
  }

  undo(): boolean {
    const prev = this.history.pop();
    if (!prev) return false;

    this.pieces = prev.pieces.map((p) => ({ ...p }));
    this.turn = prev.turn;
    this.phase = prev.phase;
    this.winner = prev.winner;
    this.winLine = prev.winLine?.map((c) => ({ ...c })) ?? null;
    this.moveCount = prev.moveCount;
    this.selected = null;
    this.finishedAt = null;
    if (this.phase === 'playing' && this.startedAt === null) {
      this.startedAt = Date.now();
    }
    this.emit();
    return true;
  }

  isAiTurn(): boolean {
    return (
      this.phase === 'playing' &&
      this.mode === 'ai' &&
      this.turn !== this.humanColor
    );
  }
}
