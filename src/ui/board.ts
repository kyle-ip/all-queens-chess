import { BOARD_SIZE, type Color, type Coord, type Piece } from '../game/types';
import { cellTint } from '../game/board';
import { legalMovesFor } from '../game/moves';
import type { GameSnapshot } from '../game/state';

/** Woodcut / manuscript-style queen — bold ink outline, flat pigment, hatching */
const QUEEN_SVG = `
<svg class="queen-svg" viewBox="0 0 72 100" aria-hidden="true">
  <ellipse class="queen-shadow" cx="36" cy="93" rx="20" ry="3.5"/>
  <path class="queen-base" d="M18 76c1-5 5-8 10-9h16c5 1 9 4 10 9v6H18z"/>
  <path class="queen-stem" d="M27 42c-2 7-3 18-2 32h22c1-14 0-25-2-32-3-3-7-4-11-4s-8 1-11 4z"/>
  <path class="queen-bust" d="M24 40c2-7 6-11 12-13 6 2 10 6 12 13-3 2-7 3-12 3s-9-1-12-3z"/>
  <path class="queen-crown" d="M22 30c0-2 2-4 4-5l2-9 5 7 3-12 3 12 5-7 2 9c2 1 4 3 4 5l-3 5H25z"/>
  <path class="queen-hatch" d="M18 76c1-5 5-8 10-9h16c5 1 9 4 10 9v6H18zM27 42c-2 7-3 18-2 32h22c1-14 0-25-2-32-3-3-7-4-11-4s-8 1-11 4z"/>
  <circle class="queen-orb" cx="36" cy="12" r="3.2"/>
  <circle class="queen-tip" cx="22" cy="24" r="2.2"/>
  <circle class="queen-tip" cx="29" cy="18" r="2.2"/>
  <circle class="queen-tip" cx="43" cy="18" r="2.2"/>
  <circle class="queen-tip" cx="50" cy="24" r="2.2"/>
  <path class="queen-band" d="M25 44h22v3H25z"/>
</svg>
`;

const CROWN_SVG = `
<svg class="crown-mark" viewBox="0 0 28 28" aria-hidden="true">
  <circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" stroke-width="1.6"/>
  <path fill="currentColor" d="M8 18 10 11l2.5 3.5L14 8l1.5 6.5L18 11l2 7z"/>
</svg>
`;

export type BoardCallbacks = {
  onCellClick: (row: number, col: number) => void;
};

export class BoardView {
  private root: HTMLElement;
  private wrap: HTMLElement;
  private callbacks: BoardCallbacks;
  private cells = new Map<string, HTMLButtonElement>();
  private animating = false;

  constructor(
    boardEl: HTMLElement,
    wrapEl: HTMLElement,
    callbacks: BoardCallbacks,
  ) {
    this.root = boardEl;
    this.wrap = wrapEl;
    this.callbacks = callbacks;
    this.buildGrid();
  }

  private key(row: number, col: number): string {
    return `${row},${col}`;
  }

  private buildGrid(): void {
    this.root.innerHTML = '';
    this.cells.clear();
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tint = cellTint(row, col);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `cell tint-${tint}`;
        btn.dataset.row = String(row);
        btn.dataset.col = String(col);
        btn.setAttribute('role', 'gridcell');
        btn.style.gridRow = String(row + 1);
        btn.style.gridColumn = String(col + 1);

        const inlay = document.createElement('span');
        inlay.className = 'cell-inlay';
        btn.appendChild(inlay);

        if (tint !== 'neutral') {
          const mark = document.createElement('span');
          mark.className = 'cell-mark';
          mark.innerHTML = CROWN_SVG;
          btn.appendChild(mark);
        }

        const pieceSlot = document.createElement('span');
        pieceSlot.className = 'piece-slot';
        btn.appendChild(pieceSlot);

        const glow = document.createElement('span');
        glow.className = 'cell-glow';
        btn.appendChild(glow);

        btn.addEventListener('click', () => {
          if (this.animating) return;
          this.callbacks.onCellClick(row, col);
        });

        this.root.appendChild(btn);
        this.cells.set(this.key(row, col), btn);
      }
    }
  }

  setVisible(visible: boolean): void {
    this.wrap.hidden = !visible;
  }

  render(state: GameSnapshot): void {
    const legal = state.selected
      ? legalMovesFor(state.pieces, state.selected)
      : [];
    const legalSet = new Set(legal.map((c) => this.key(c.row, c.col)));
    const winSet = new Set(
      (state.winLine ?? []).map((c) => this.key(c.row, c.col)),
    );
    const occ = new Map<string, Piece>();
    for (const p of state.pieces) occ.set(this.key(p.row, p.col), p);

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const k = this.key(row, col);
        const cell = this.cells.get(k)!;
        const piece = occ.get(k);
        const selected =
          !!state.selected &&
          state.selected.row === row &&
          state.selected.col === col;

        cell.classList.toggle('is-legal', legalSet.has(k));
        cell.classList.toggle('is-selected', selected);
        cell.classList.toggle('is-win', winSet.has(k));
        cell.classList.toggle('has-piece', !!piece);

        const slot = cell.querySelector('.piece-slot')!;
        if (!piece) {
          slot.innerHTML = '';
          slot.className = 'piece-slot';
          slot.removeAttribute('data-id');
          continue;
        }
        if (slot.getAttribute('data-id') !== piece.id) {
          slot.setAttribute('data-id', piece.id);
          slot.className = `piece-slot piece ${piece.color}`;
          slot.innerHTML = QUEEN_SVG;
        } else {
          slot.className = `piece-slot piece ${piece.color}`;
        }
        slot.classList.toggle('is-selected', selected);
      }
    }
  }

  async animateMove(
    from: Coord,
    to: Coord,
    color: Color,
    pieceId: string,
  ): Promise<void> {
    const fromCell = this.cells.get(this.key(from.row, from.col));
    const toCell = this.cells.get(this.key(to.row, to.col));
    if (!fromCell || !toCell) return;

    this.animating = true;
    const fromRect = fromCell.getBoundingClientRect();
    const toRect = toCell.getBoundingClientRect();

    const flyer = document.createElement('div');
    flyer.className = `piece-flyer piece ${color}`;
    flyer.innerHTML = QUEEN_SVG;
    flyer.style.width = `${fromRect.width * 0.78}px`;
    flyer.style.height = `${fromRect.height * 0.9}px`;
    flyer.style.left = `${fromRect.left + fromRect.width * 0.11}px`;
    flyer.style.top = `${fromRect.top + fromRect.height * 0.04}px`;
    document.body.appendChild(flyer);

    const fromSlot = fromCell.querySelector('.piece-slot') as HTMLElement;
    fromSlot.style.opacity = '0';

    await new Promise((r) => requestAnimationFrame(() => r(null)));
    flyer.style.transform = `translate(${toRect.left - fromRect.left}px, ${
      toRect.top - fromRect.top
    }px) scale(1.05)`;
    flyer.style.transition =
      'transform 320ms cubic-bezier(.22,.9,.28,1), filter 320ms ease';
    flyer.style.filter = 'drop-shadow(0 10px 12px rgba(40,20,10,.35))';

    await new Promise((r) => setTimeout(r, 330));
    flyer.remove();
    fromSlot.style.opacity = '';
    fromSlot.removeAttribute('data-id');
    this.animating = false;
    void pieceId;
  }

  get isBusy(): boolean {
    return this.animating;
  }
}
