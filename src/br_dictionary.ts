export interface BRDictionary {
  // Тексты интерфейса
  readonly APP_TITLE: string;
  readonly APP_SUBTITLE: string;
  readonly PAUSE_TITLE: string;
  readonly BTN_START: string;
  readonly BTN_PAUSE: string;
  readonly BTN_RESET: string;
  readonly BTN_RESUME: string;
  readonly BTN_LOADING: string;
  readonly HINT_SPACE_KEY: string;
  readonly HINT_SPACE_DESC: string;
  readonly HINT_RESET_KEY: string;
  readonly HINT_RESET_DESC: string;

  // Системные константы
  readonly STATE_CHANGE_EVENT: string;
  readonly CONTEXT: '2d';
  readonly MAX_DPR: number;
  readonly DPR: number;
  readonly INTRO_START_DELAY: number;
  readonly SETTLE_DURATION: number;
  readonly MOBILE_BREAKPOINT: number;
  readonly BASE_FONT: string;
  readonly BASE_FONT_SIZE: number;

  // Коэффициенты рендерера
  readonly SCROLL_EASING: number;
  readonly LINE_FADE_IN_STEP: number;
  readonly LINE_FADE_OUT_STEP: number;
  readonly DIMMED_LINE_OPACITY: number;
  readonly FINISHED_LINE_FADE: number;
  readonly ACTIVE_WORD_GLOW: number;
  readonly MIN_FONT_SIZE: number;
  readonly MIN_PADDING_X: number;
  readonly PADDING_X_RATIO: number;
  readonly MIN_LINE_WIDTH: number;
  readonly MIN_LINE_HEIGHT: number;
  readonly MIN_INITIAL_Y: number;

  // Коэффициенты парсера, темпа и пауз
  readonly DEFAULT_TEMPO_FACTOR: number;
  readonly MIN_TEMPO_FACTOR: number;
  readonly MAX_TEMPO_FACTOR: number;
  readonly MAX_FAST_SCALE: number;
  readonly MIN_TAG_CHUNK_DELAY: number;
  readonly SPACE_DELAY_RATIO: number;
  readonly PAUSE_RESUME_RATIO: number;
  readonly MIN_RESUME_DELAY: number;

  // Коэффициенты спрайтов и частиц
  readonly SPRITE_PAD_X: number;
  readonly SPRITE_MIN_SIZE: number;
  readonly SPRITE_LINE_RATIO: number;
  readonly SPRITE_GLOW_BLUR: number;
  readonly MOBILE_PARTICLE_RATIO: number;

  // Эффекты
  readonly FLASH_MIN_SPREAD: number;
  readonly FLASH_COUNT: number;
  readonly DEFAULT_MIN_DURATION: number;
  readonly DEFAULT_PAD_DURATION: number;
  readonly FIREFLIES_MIN_DURATION: number;
  readonly FIREFLIES_PAD_DURATION: number;
  readonly SAND_MIN_DURATION: number;
  readonly SAND_PAD_DURATION: number;
  readonly GLITTER_MIN_DURATION: number;
  readonly GLITTER_PAD_DURATION: number;
  readonly BREEZE_MIN_DURATION: number;
  readonly BREEZE_PAD_DURATION: number;
  readonly FROST_MIN_DURATION: number;
  readonly FROST_PAD_DURATION: number;
  readonly CONSTELLATION_MIN_DURATION: number;
  readonly CONSTELLATION_PAD_DURATION: number;
  readonly WIND_MIN_DURATION: number;
  readonly WIND_PAD_DURATION: number;
  readonly EMBERS_MIN_DURATION: number;
  readonly EMBERS_PAD_DURATION: number;
  readonly SNOW_MIN_DURATION: number;
  readonly SNOW_PAD_DURATION: number;
  readonly SPARKS_MIN_DURATION: number;
  readonly SPARKS_PAD_DURATION: number;
  readonly DANDELION_MIN_DURATION: number;
  readonly DANDELION_PAD_DURATION: number;
  readonly WATER_MIN_DURATION: number;
  readonly WATER_PAD_DURATION: number;
  readonly ECHO_MIN_DURATION: number;
  readonly ECHO_PAD_DURATION: number;
  readonly MIRROR_MIN_DURATION: number;
  readonly MIRROR_PAD_DURATION: number;
  readonly GROW_MIN_DURATION: number;
  readonly GROW_PAD_DURATION: number;
  readonly FIRE_MIN_DURATION: number;
  readonly FIRE_PAD_DURATION: number;
  readonly RIPPLE_MIN_DURATION: number;
  readonly RIPPLE_PAD_DURATION: number;
  readonly SYLLABIC_PAD_DURATION: number;
  readonly SYLLABIC_RATIO: number;
  readonly SLOW_PRE_PAUSE: number;

  // ID's в HTML
  readonly ID_ENGINE: string;
  readonly ID_TOOLBAR: string;
  readonly ID_START_OVERLAY: string;
  readonly ID_BTN_INTRO: string;
  readonly ID_BTN_START: string;
  readonly ID_BTN_RESET: string;
  readonly ID_PAUSE_OVERLAY: string;
  readonly ID_BTN_RESUME: string;
  readonly INTRO_TAIL_SELECTOR: string;

  // CSS-токены из :root
  readonly BGR: string;
  readonly OVERLAY: string;
  readonly BASE: string;
  readonly NEON: string;
  readonly FONT_MONO: string;
  readonly BTN_SIZE: number;
  readonly BTN_SIZE_LG: number;
  readonly TOOLBAR_BOTTOM: number;
}

type CssTokenKeys =
    | 'DPR'
    | 'MOBILE_BREAKPOINT'
    | 'BGR'
    | 'OVERLAY'
    | 'BASE'
    | 'NEON'
    | 'FONT_MONO'
    | 'BTN_SIZE'
    | 'BTN_SIZE_LG'
    | 'TOOLBAR_BOTTOM';

const entries = {
  // Тексты интерфейса
  APP_TITLE: '...BREATHE\u00A0\u00A0\n\u00A0\u00A0RHYTHM...',
  APP_SUBTITLE: '...В ритме дыхания...',
  PAUSE_TITLE: '...ПАУЗА...',
  BTN_START: 'Старт',
  BTN_PAUSE: 'Пауза',
  BTN_RESET: 'Сброс',
  BTN_RESUME: 'Продолжить',
  BTN_LOADING: 'Загрузка',
  HINT_SPACE_KEY: 'SPACE',
  HINT_SPACE_DESC: 'старт / пауза',
  HINT_RESET_KEY: 'R',
  HINT_RESET_DESC: 'выход',

  // Системные константы
  STATE_CHANGE_EVENT: 'engine-state-change',
  CONTEXT: '2d',
  MAX_DPR: 2,
  INTRO_START_DELAY: 250,
  SETTLE_DURATION: 200,
  BASE_FONT: '"Courier New", monospace',
  BASE_FONT_SIZE: 24,

  // Коэффициенты рендерера
  SCROLL_EASING: 0.035,
  LINE_FADE_IN_STEP: 0.015,
  LINE_FADE_OUT_STEP: 0.04,
  DIMMED_LINE_OPACITY: 0.3,
  FINISHED_LINE_FADE: 0.85,
  ACTIVE_WORD_GLOW: 20,
  MIN_FONT_SIZE: 16,
  MIN_PADDING_X: 20,
  PADDING_X_RATIO: 0.06,
  MIN_LINE_WIDTH: 100,
  MIN_LINE_HEIGHT: 24,
  MIN_INITIAL_Y: 36,

  // Коэффициенты парсера, темпа и пауз
  DEFAULT_TEMPO_FACTOR: 0.5,
  MIN_TEMPO_FACTOR: 0.05,
  MAX_TEMPO_FACTOR: 5,
  MAX_FAST_SCALE: 0.85,
  MIN_TAG_CHUNK_DELAY: 150,
  SPACE_DELAY_RATIO: 0.5,
  PAUSE_RESUME_RATIO: 0.5,
  MIN_RESUME_DELAY: 200,

  // Коэффициенты спрайтов и частиц
  SPRITE_PAD_X: 24,
  SPRITE_MIN_SIZE: 10,
  SPRITE_LINE_RATIO: 1.8,
  SPRITE_GLOW_BLUR: 16,
  MOBILE_PARTICLE_RATIO: 0.65,

  // Эффекты
  FLASH_MIN_SPREAD: 400,
  FLASH_COUNT: 60,
  DEFAULT_MIN_DURATION: 450,
  DEFAULT_PAD_DURATION: 300,
  FIREFLIES_MIN_DURATION: 950,
  FIREFLIES_PAD_DURATION: 300,
  SAND_MIN_DURATION: 950,
  SAND_PAD_DURATION: 300,
  GLITTER_MIN_DURATION: 950,
  GLITTER_PAD_DURATION: 450,
  BREEZE_MIN_DURATION: 950,
  BREEZE_PAD_DURATION: 300,
  FROST_MIN_DURATION: 950,
  FROST_PAD_DURATION: 300,
  CONSTELLATION_MIN_DURATION: 1150,
  CONSTELLATION_PAD_DURATION: 200,
  WIND_MIN_DURATION: 850,
  WIND_PAD_DURATION: 300,
  EMBERS_MIN_DURATION: 900,
  EMBERS_PAD_DURATION: 380,
  SNOW_MIN_DURATION: 1100,
  SNOW_PAD_DURATION: 450,
  SPARKS_MIN_DURATION: 850,
  SPARKS_PAD_DURATION: 350,
  DANDELION_MIN_DURATION: 1050,
  DANDELION_PAD_DURATION: 480,
  WATER_MIN_DURATION: 900,
  WATER_PAD_DURATION: 350,
  ECHO_MIN_DURATION: 850,
  ECHO_PAD_DURATION: 420,
  MIRROR_MIN_DURATION: 950,
  MIRROR_PAD_DURATION: 420,
  GROW_MIN_DURATION: 600,
  GROW_PAD_DURATION: 250,
  FIRE_MIN_DURATION: 1000,
  FIRE_PAD_DURATION: 400,
  RIPPLE_MIN_DURATION: 1000,
  RIPPLE_PAD_DURATION: 420,
  SYLLABIC_PAD_DURATION: 350,
  SYLLABIC_RATIO: 4,
  SLOW_PRE_PAUSE: 150,

  // ID's в HTML
  ID_ENGINE: 'engine',
  ID_TOOLBAR: 'controls',
  ID_START_OVERLAY: 'startOverlay',
  ID_BTN_INTRO: 'btnIntro',
  ID_BTN_START: 'btnStart',
  ID_BTN_RESET: 'btnReset',
  ID_PAUSE_OVERLAY: 'pauseOverlay',
  ID_BTN_RESUME: 'btnResume',
  INTRO_TAIL_SELECTOR: 'ui-subtitle .sub-dots-left .dot:first-child',
} as const satisfies Omit<BRDictionary, CssTokenKeys>;

const cache = new Map<string, unknown>(Object.entries(entries));

const parseCssValue = (raw: string): string | number => {
  const unquoted = raw.replace(/^['"]|['"]$/g, '').trim();

  if (/^-?\d+(\.\d+)?(px)?$/.test(unquoted)) {
    return parseFloat(unquoted);
  }
  return unquoted;
};

const getDPR = () => typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, brDict['MAX_DPR']) : 1;

export const brDict = new Proxy({} as BRDictionary, {
  has (_, prop: string | symbol): boolean {
    if (typeof prop !== 'string') {
      return false;
    }
    if (prop === 'DPR' || cache.has(prop)) {
      return true;
    }
    return Boolean(brDict[prop as keyof BRDictionary]);
  },
  get (_, prop: string | symbol): unknown {
    if (typeof prop !== 'string') {
      return '';
    }

    if (prop === 'DPR') {
      return getDPR();
    }

    if (cache.has(prop)) {
      return cache.get(prop);
    }

    if (typeof document === 'undefined') {
      return '';
    }

    const cssName = `--${ prop.toLowerCase().replace(/_/g, '-') }`;
    const rawValue = getComputedStyle(document.documentElement)
        .getPropertyValue(cssName)
        .trim();

    if (!rawValue) {
      return '';
    }

    const value = parseCssValue(rawValue);
    cache.set(prop, value);
    return value;
  },
});

export const isBrDictKey = (key: string | undefined): key is keyof BRDictionary =>
    Boolean(key && key in brDict);

