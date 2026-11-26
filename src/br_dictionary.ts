export interface BRDictionary {
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

  readonly STATE_CHANGE_EVENT: string;
  readonly MAX_DPR: number;
  readonly DPR: number;
  readonly SETTLE_DURATION: number;
  readonly MOBILE_BREAKPOINT: number;

  readonly BGR: string;
  readonly OVERLAY: string;
  readonly BASE: string;
  readonly NEON: string;
  readonly FONT_MONO: string;
  readonly BTN_SIZE: number;
  readonly BTN_SIZE_LG: number;
  readonly TOOLBAR_BOTTOM: number;

  readonly [cssVar: string]: string | number;
}

const cache = new Map<string, unknown>([
  ['APP_TITLE', '...BREATHE\u00A0\u00A0\n\u00A0\u00A0RHYTHM...'],
  ['APP_SUBTITLE', '...в ритме дыхания...'],
  ['PAUSE_TITLE', '...ПАУЗА...'],
  ['BTN_START', 'Старт'],
  ['BTN_PAUSE', 'Пауза'],
  ['BTN_RESET', 'Сброс'],
  ['BTN_RESUME', 'Продолжить'],
  ['BTN_LOADING', 'Загрузка'],
  ['HINT_SPACE_KEY', 'SPACE'],
  ['HINT_SPACE_DESC', 'старт / пауза'],
  ['HINT_RESET_KEY', 'R'],
  ['HINT_RESET_DESC', 'выход'],

  ['STATE_CHANGE_EVENT', 'engine-state-change'],
  ['MAX_DPR', 2],
  ['SETTLE_DURATION', 200],
]);

function parseCssValue (raw: string): string | number {
  const unquoted = raw.replace(/^['"]|['"]$/g, '').trim();

  if (/^-?\d+(\.\d+)?(px)?$/.test(unquoted)) {
    return parseFloat(unquoted);
  }
  return unquoted;
}

export const brDict = new Proxy({} as BRDictionary, {
  has (_, prop: string | symbol): boolean {
    if (typeof prop !== 'string') {
      return false;
    }
    if (prop === 'DPR' || cache.has(prop)) {
      return true;
    }
    return Boolean(brDict[prop]);
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

const getDPR = () => typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, brDict['MAX_DPR']) : 1;

export function applyDict (root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-dict]').forEach((el) => {
    const key = el.dataset.dict;
    if (!key || !(key in brDict)) {
      return;
    }

    const val = String(brDict[key]);
    if (el.tagName === 'UI-BUTTON') {
      el.setAttribute('label', val);
    } else {
      el.textContent = val;
    }
  });
}


