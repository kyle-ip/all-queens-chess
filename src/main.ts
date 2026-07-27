import './styles/main.css';
import { onLocaleChange, t } from './i18n';
import { GameState } from './game/state';
import { pieceAt } from './game/board';
import { isLegalMove } from './game/moves';
import { chooseAiMove, aiThinkDelay } from './ai/ai';
import { Hud } from './ui/hud';
import { BoardView } from './ui/board';

const hudRoot = document.querySelector<HTMLElement>('#hud')!;
const boardEl = document.querySelector<HTMLElement>('#board')!;
const boardWrap = document.querySelector<HTMLElement>('#board-wrap')!;

const game = new GameState();
let aiTimer: number | null = null;
let clockTimer: number | null = null;
let inputLocked = false;

const board = new BoardView(boardEl, boardWrap, {
  onCellClick: (row, col) => {
    void handleCellClick(row, col);
  },
});

const hud = new Hud(hudRoot, {
  onStart: (opts) => {
    clearAi();
    game.startGame(opts);
  },
  onMenu: () => {
    clearAi();
    stopClock();
    game.returnToMenu();
  },
  onNewGame: () => {
    clearAi();
    game.startGame(hud.getLastOpts());
  },
  onUndo: () => {
    if (board.isBusy || inputLocked) return;
    clearAi();
    game.undo();
  },
});

function clearAi(): void {
  if (aiTimer !== null) {
    window.clearTimeout(aiTimer);
    aiTimer = null;
  }
}

function stopClock(): void {
  if (clockTimer !== null) {
    window.clearInterval(clockTimer);
    clockTimer = null;
  }
}

function startClock(): void {
  stopClock();
  clockTimer = window.setInterval(() => {
    const state = game.snapshot();
    if (state.phase !== 'playing') {
      stopClock();
      hud.updateStats(state);
      return;
    }
    hud.updateStats(state);
  }, 250);
}

function scheduleAi(): void {
  clearAi();
  if (!game.isAiTurn() || board.isBusy || inputLocked) return;
  const delay = aiThinkDelay(hud.getDifficulty());
  aiTimer = window.setTimeout(() => {
    aiTimer = null;
    void runAiMove();
  }, delay);
}

function paint(): void {
  const state = game.snapshot();
  hud.render(state);
  const showBoard = state.phase === 'playing' || state.phase === 'won';
  board.setVisible(showBoard);
  if (showBoard) board.render(state);
  if (state.phase === 'playing') startClock();
  else stopClock();
}

async function playAnimatedMove(
  from: { row: number; col: number },
  to: { row: number; col: number },
  color: 'red' | 'black',
  pieceId: string,
  apply: () => void,
): Promise<void> {
  inputLocked = true;
  await board.animateMove(from, to, color, pieceId);
  apply();
  inputLocked = false;
  paint();
}

async function runAiMove(): Promise<void> {
  if (!game.isAiTurn() || board.isBusy || inputLocked) return;
  const snap = game.snapshot();
  const move = chooseAiMove(snap.pieces, snap.turn, hud.getDifficulty());
  if (!move) return;
  const moving = pieceAt(snap.pieces, move.from.row, move.from.col);
  if (!moving) return;

  await playAnimatedMove(move.from, move.to, moving.color, moving.id, () => {
    game.applyAiMove(move);
  });
}

async function handleCellClick(row: number, col: number): Promise<void> {
  if (board.isBusy || inputLocked) return;
  const state = game.snapshot();
  if (state.phase !== 'playing') return;
  if (state.mode === 'ai' && state.turn !== state.humanColor) return;

  const selected = state.selected;
  if (
    selected &&
    !(selected.row === row && selected.col === col) &&
    isLegalMove(state.pieces, selected, { row, col })
  ) {
    const moving = pieceAt(state.pieces, selected.row, selected.col);
    if (!moving) return;
    await playAnimatedMove(
      selected,
      { row, col },
      moving.color,
      moving.id,
      () => {
        game.applyMove({ from: selected, to: { row, col } });
      },
    );
    scheduleAi();
    return;
  }

  game.selectSquare(row, col);
}

game.subscribe((state) => {
  if (inputLocked) {
    hud.render(state);
    return;
  }
  paint();
  if (state.phase === 'playing' && game.isAiTurn()) {
    scheduleAi();
  }
});

onLocaleChange(() => {
  boardEl.setAttribute('aria-label', t('boardLabel'));
  paint();
});

boardEl.setAttribute('aria-label', t('boardLabel'));
