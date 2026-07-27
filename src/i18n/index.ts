export type Locale = 'en' | 'zh';

const STORAGE_KEY = 'aqc-locale';

const messages = {
  en: {
    docTitle: 'All Queens Chess',
    brandTitle: 'All Queens Chess',
    eyebrow: 'ThinkFun · Abstract Strategy',
    blurb:
      'Every piece is a queen. Align four in a row — without capturing.',
    mode: 'Mode',
    modeLocal: 'Local',
    modeAi: 'vs AI',
    difficulty: 'Difficulty',
    diffEasy: 'Easy',
    diffNormal: 'Normal',
    diffHard: 'Hard',
    diffEasyHint: 'Casual play — may overlook threats.',
    diffNormalHint: 'Solid tactics — blocks and builds lines.',
    diffHardHint: 'Deep search — plans several moves ahead.',
    youPlayAs: 'You play as',
    firstToMove: 'First to move',
    colorRed: 'Red',
    colorBlack: 'Black',
    begin: 'Begin',
    rules: 'Rules',
    menu: 'Menu',
    newGame: 'New Game',
    undo: 'Undo',
    playAgain: 'Play again',
    localTwoPlayers: 'Local · two players',
    vsAiYouAre: 'vs AI ({difficulty}) · you are {color}',
    redToMove: 'Red to move',
    blackToMove: 'Black to move',
    redWins: 'Red wins!',
    blackWins: 'Black wins!',
    moveCount: '{count} moves',
    langEn: 'EN',
    langZh: '中文',
    rulesTitle: 'Rules',
    rulesClose: 'Close',
    rulesBody: `
      <h3>Objective</h3>
      <p>Be the first to arrange <strong>four</strong> of your queens in a contiguous line — horizontally, vertically, or diagonally.</p>
      <h3>Setup</h3>
      <p>Each player has six queens. Red queens start on black squares; black queens start on red squares. Players decide who moves first.</p>
      <h3>Movement</h3>
      <p>Queens move like in chess: any number of squares horizontally, vertically, or diagonally. You may not jump over another queen, and you may not capture.</p>
      <h3>Winning</h3>
      <p>After your move, if four or more of your queens form a contiguous straight line, you win.</p>
    `,
    boardLabel: '5 by 5 All Queens Chess board',
  },
  zh: {
    docTitle: '皇后棋',
    brandTitle: '皇后棋',
    eyebrow: 'ThinkFun · 抽象策略',
    blurb: '每一子都是皇后。先让四枚皇后连成一线者获胜——不可吃子。',
    mode: '模式',
    modeLocal: '本地双人',
    modeAi: '人机对战',
    difficulty: '难度',
    diffEasy: '简单',
    diffNormal: '普通',
    diffHard: '困难',
    diffEasyHint: '轻松对局——偶有漏防。',
    diffNormalHint: '扎实战术——会封堵并连线。',
    diffHardHint: '深层搜索——会多步预判。',
    youPlayAs: '你执',
    firstToMove: '先手',
    colorRed: '红方',
    colorBlack: '黑方',
    begin: '开始',
    rules: '规则',
    menu: '菜单',
    newGame: '新局',
    undo: '悔棋',
    playAgain: '再来一局',
    localTwoPlayers: '本地 · 双人轮流',
    vsAiYouAre: '人机（{difficulty}）· 你执{color}',
    redToMove: '红方行棋',
    blackToMove: '黑方行棋',
    redWins: '恭喜红方！',
    blackWins: '恭喜黑方！',
    moveCount: '{count} 步',
    langEn: 'EN',
    langZh: '中文',
    rulesTitle: '规则说明',
    rulesClose: '关闭',
    rulesBody: `
      <h3>目标</h3>
      <p>率先让己方 <strong>四枚</strong> 皇后在横、竖或斜方向连成一线。</p>
      <h3>布置</h3>
      <p>双方各六枚皇后。红色皇后放在黑色格，黑色皇后放在红色格。由玩家自行决定谁先行动。</p>
      <h3>移动</h3>
      <p>走法同国际象棋皇后：可沿横、竖、斜任意格数移动。不可跳过其他皇后，也不可吃子。</p>
      <h3>获胜</h3>
      <p>落子后若己方已有四枚或以上皇后连成一线，即获胜。</p>
    `,
    boardLabel: '五乘五皇后棋棋盘',
  },
} as const;

export type MessageKey = keyof typeof messages.en;

type Listener = (locale: Locale) => void;

let locale: Locale = loadLocale();
const listeners = new Set<Listener>();

function loadLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {
    /* ignore */
  }
  return 'en';
}

export function getLocale(): Locale {
  return locale;
}

export function setLocale(next: Locale): void {
  if (locale === next) return;
  locale = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
  document.title = messages[next].docTitle;
  for (const l of listeners) l(locale);
}

export function onLocaleChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t(
  key: MessageKey,
  vars?: Record<string, string>,
): string {
  let text: string = messages[locale][key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, v);
    }
  }
  return text;
}

export function colorLabel(color: 'red' | 'black'): string {
  return color === 'red' ? t('colorRed') : t('colorBlack');
}

document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
document.title = messages[locale].docTitle;
