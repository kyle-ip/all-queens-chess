import type { Color, GameMode } from '../game/types';
import type { AiDifficulty } from '../ai/ai';
import type { GameSnapshot } from '../game/state';
import {
  colorLabel,
  getLocale,
  onLocaleChange,
  setLocale,
  t,
  type Locale,
} from '../i18n';

export type StartOpts = {
  mode: GameMode;
  firstPlayer: Color;
  humanColor: Color;
  difficulty: AiDifficulty;
};

export type HudCallbacks = {
  onStart: (opts: StartOpts) => void;
  onMenu: () => void;
  onNewGame: () => void;
  onUndo: () => void;
};

export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export class Hud {
  private root: HTMLElement;
  private callbacks: HudCallbacks;
  private lastOpts: StartOpts = {
    mode: 'local',
    firstPlayer: 'red',
    humanColor: 'red',
    difficulty: 'normal',
  };
  private menuMounted = false;
  private draft: StartOpts = { ...this.lastOpts };
  private lastState: GameSnapshot | null = null;
  private rulesOpen = false;
  private unsubLocale: (() => void) | null = null;

  constructor(root: HTMLElement, callbacks: HudCallbacks) {
    this.root = root;
    this.callbacks = callbacks;
    this.unsubLocale = onLocaleChange(() => {
      this.menuMounted = false;
      if (this.lastState) this.render(this.lastState);
    });
  }

  dispose(): void {
    this.unsubLocale?.();
  }

  render(state: GameSnapshot): void {
    this.lastState = state;
    if (state.phase === 'menu') {
      if (!this.menuMounted) {
        this.renderMenu();
        this.menuMounted = true;
      }
      if (this.rulesOpen) this.mountRulesModal();
      return;
    }
    this.menuMounted = false;
    this.rulesOpen = false;
    this.renderPlay(state);
  }

  private langToggleHtml(): string {
    const locale = getLocale();
    return `
      <div class="lang-toggle" role="group" aria-label="Language">
        <button type="button" data-lang="en" class="${locale === 'en' ? 'active' : ''}">${t('langEn')}</button>
        <button type="button" data-lang="zh" class="${locale === 'zh' ? 'active' : ''}">${t('langZh')}</button>
      </div>
    `;
  }

  private bindLangToggle(scope: ParentNode = this.root): void {
    scope.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = (btn as HTMLElement).dataset.lang as Locale;
        setLocale(next);
      });
    });
  }

  private difficultyLabel(d: AiDifficulty): string {
    if (d === 'easy') return t('diffEasy');
    if (d === 'hard') return t('diffHard');
    return t('diffNormal');
  }

  private renderMenu(): void {
    const { mode, firstPlayer, humanColor, difficulty } = this.draft;
    this.root.innerHTML = `
      <div class="menu-shell fade-in">
        <div class="panel">
          ${this.langToggleHtml()}
          <p class="eyebrow">${t('eyebrow')}</p>
          <h1 class="brand-title">${t('brandTitle')}</h1>
          <p class="blurb">${t('blurb')}</p>

          <div class="field">
            <label>${t('mode')}</label>
            <div class="seg" data-field="mode">
              <button type="button" data-value="local" class="${mode === 'local' ? 'active' : ''}">${t('modeLocal')}</button>
              <button type="button" data-value="ai" class="${mode === 'ai' ? 'active' : ''}">${t('modeAi')}</button>
            </div>
          </div>

          <div class="field" id="human-field" ${mode !== 'ai' ? 'hidden' : ''}>
            <label>${t('youPlayAs')}</label>
            <div class="seg" data-field="human">
              <button type="button" data-value="red" class="${humanColor === 'red' ? 'active' : ''}">${t('colorRed')}</button>
              <button type="button" data-value="black" class="${humanColor === 'black' ? 'active' : ''}">${t('colorBlack')}</button>
            </div>
          </div>

          <div class="field" id="diff-field" ${mode !== 'ai' ? 'hidden' : ''}>
            <label>${t('difficulty')}</label>
            <div class="seg seg-3" data-field="difficulty">
              <button type="button" data-value="easy" class="${difficulty === 'easy' ? 'active' : ''}">${t('diffEasy')}</button>
              <button type="button" data-value="normal" class="${difficulty === 'normal' ? 'active' : ''}">${t('diffNormal')}</button>
              <button type="button" data-value="hard" class="${difficulty === 'hard' ? 'active' : ''}">${t('diffHard')}</button>
            </div>
            <p class="field-hint" id="diff-hint">${t(
              difficulty === 'easy'
                ? 'diffEasyHint'
                : difficulty === 'hard'
                  ? 'diffHardHint'
                  : 'diffNormalHint',
            )}</p>
          </div>

          <div class="field">
            <label>${t('firstToMove')}</label>
            <div class="seg" data-field="first">
              <button type="button" data-value="red" class="${firstPlayer === 'red' ? 'active' : ''}">${t('colorRed')}</button>
              <button type="button" data-value="black" class="${firstPlayer === 'black' ? 'active' : ''}">${t('colorBlack')}</button>
            </div>
          </div>

          <button type="button" class="cta" id="start-btn">${t('begin')}</button>
          <p class="hint"><button type="button" class="linkish" id="rules-btn">${t('rules')}</button></p>
        </div>
      </div>
    `;

    const humanField = this.root.querySelector('#human-field') as HTMLElement;
    const diffField = this.root.querySelector('#diff-field') as HTMLElement;
    const diffHint = this.root.querySelector('#diff-hint') as HTMLElement;

    const syncDiffHint = () => {
      const key =
        this.draft.difficulty === 'easy'
          ? 'diffEasyHint'
          : this.draft.difficulty === 'hard'
            ? 'diffHardHint'
            : 'diffNormalHint';
      diffHint.textContent = t(key);
    };

    this.root.querySelectorAll('.seg').forEach((seg) => {
      const field = (seg as HTMLElement).dataset.field;
      seg.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          seg.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          const v = (btn as HTMLElement).dataset.value!;
          if (field === 'mode') {
            this.draft.mode = v as GameMode;
            const ai = this.draft.mode === 'ai';
            humanField.hidden = !ai;
            diffField.hidden = !ai;
          } else if (field === 'first') {
            this.draft.firstPlayer = v as Color;
          } else if (field === 'human') {
            this.draft.humanColor = v as Color;
          } else if (field === 'difficulty') {
            this.draft.difficulty = v as AiDifficulty;
            syncDiffHint();
          }
        });
      });
    });

    this.root.querySelector('#start-btn')!.addEventListener('click', () => {
      this.lastOpts = { ...this.draft };
      this.callbacks.onStart({ ...this.draft });
    });

    this.root.querySelector('#rules-btn')!.addEventListener('click', () => {
      this.rulesOpen = true;
      this.mountRulesModal();
    });

    this.bindLangToggle();
  }

  private mountRulesModal(): void {
    this.root.querySelector('.rules-modal')?.remove();
    const modal = document.createElement('div');
    modal.className = 'rules-modal fade-in';
    modal.innerHTML = `
      <div class="rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <div class="rules-head">
          <h2 id="rules-title">${t('rulesTitle')}</h2>
          <button type="button" class="ghost" id="rules-close">${t('rulesClose')}</button>
        </div>
        <div class="rules-body">${t('rulesBody')}</div>
      </div>
    `;
    this.root.appendChild(modal);

    const close = () => {
      this.rulesOpen = false;
      modal.remove();
    };
    modal.querySelector('#rules-close')!.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
  }

  private renderPlay(state: GameSnapshot): void {
    const turnLabel =
      state.phase === 'won'
        ? state.winner === 'red'
          ? t('redWins')
          : t('blackWins')
        : state.turn === 'red'
          ? t('redToMove')
          : t('blackToMove');

    const modeLabel =
      state.mode === 'ai'
        ? t('vsAiYouAre', {
            color: colorLabel(state.humanColor),
            difficulty: this.difficultyLabel(this.lastOpts.difficulty),
          })
        : t('localTwoPlayers');

    const turnClass =
      state.phase === 'won' ? state.winner ?? state.turn : state.turn;

    const winColor =
      state.winner === 'red' ? t('colorRed') : t('colorBlack');

    const undoDisabled = !state.canUndo ? 'disabled' : '';

    this.root.innerHTML = `
      <header class="top-bar fade-in">
        <div class="brand">
          <strong class="brand-title">${t('brandTitle')}</strong>
        </div>
        <div class="status">
          <span class="turn ${turnClass}">${turnLabel}</span>
          <span class="mode-tag">${modeLabel}</span>
          <span class="stats-tag">
            <span id="elapsed">${formatElapsed(state.elapsedMs)}</span>
            <span class="stats-sep" aria-hidden="true">·</span>
            <span id="move-count">${t('moveCount', {
              count: String(state.moveCount),
            })}</span>
          </span>
        </div>
        <div class="actions">
          ${this.langToggleHtml()}
          <button type="button" class="ghost" id="undo-btn" ${undoDisabled}>${t('undo')}</button>
          <button type="button" class="ghost" id="menu-btn">${t('menu')}</button>
          <button type="button" class="ghost" id="new-btn">${t('newGame')}</button>
        </div>
      </header>
      ${
        state.phase === 'won'
          ? `<div class="win-banner fade-in">
              <h2>${t('winTitle', { color: winColor })}</h2>
              <p>${t('winSubtitle')}</p>
              <button type="button" class="cta" id="again-btn">${t('playAgain')}</button>
            </div>`
          : ''
      }
    `;

    this.root.querySelector('#undo-btn')?.addEventListener('click', () => {
      this.callbacks.onUndo();
    });
    this.root.querySelector('#menu-btn')?.addEventListener('click', () => {
      this.callbacks.onMenu();
    });
    this.root.querySelector('#new-btn')?.addEventListener('click', () => {
      this.callbacks.onNewGame();
    });
    this.root.querySelector('#again-btn')?.addEventListener('click', () => {
      this.callbacks.onStart(this.lastOpts);
    });
    this.bindLangToggle();
  }

  /** Refresh clock/move labels without rebuilding the whole top bar. */
  updateStats(state: GameSnapshot): void {
    const elapsed = this.root.querySelector('#elapsed');
    if (elapsed) elapsed.textContent = formatElapsed(state.elapsedMs);
    const moves = this.root.querySelector('#move-count');
    if (moves) {
      moves.textContent = t('moveCount', { count: String(state.moveCount) });
    }
    const undoBtn = this.root.querySelector<HTMLButtonElement>('#undo-btn');
    if (undoBtn) undoBtn.disabled = !state.canUndo;
  }

  getLastOpts(): StartOpts {
    return this.lastOpts;
  }

  getDifficulty(): AiDifficulty {
    return this.lastOpts.difficulty;
  }
}
