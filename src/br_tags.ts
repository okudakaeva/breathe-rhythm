import { BREffectType } from './types.ts';

export interface BRTagMeta {
  type: BREffectType;
  calcDuration: (text: string, param?: string) => number;
}

export class BRTags {
  private static readonly registry: Record<string, BRTagMeta> = {
    fireflies: {
      type: 'mask',
      calcDuration: (text) => BRTags.calcMaskDuration(text),
    },
    sand: {
      type: 'mask',
      calcDuration: (text) => BRTags.calcMaskDuration(text),
    },
    glitter: {
      type: 'mask',
      calcDuration: (text) => Math.max(950, text.length * 75 + 450),
    },
    breeze: {
      type: 'mask',
      calcDuration: (text) => BRTags.calcMaskDuration(text),
    },
    frost: {
      type: 'mask',
      calcDuration: (text) => BRTags.calcMaskDuration(text),
    },
    constellation: {
      type: 'mask',
      calcDuration: (text) => Math.max(1150, (text.length * 50 + 200) * 1.5),
    },
    wind: {
      type: 'particles',
      calcDuration: (text) => Math.max(850, (text.length * 45 + 300) * 1.3),
    },
    embers: {
      type: 'particles',
      calcDuration: (text) => Math.max(900, text.length * 60 + 420),
    },
    snow: {
      type: 'particles',
      calcDuration: (text) => Math.max(1100, text.length * 70 + 500),
    },
    sparks: {
      type: 'particles',
      calcDuration: (text) => Math.max(850, text.length * 55 + 380),
    },
    dandelion: {
      type: 'particles',
      calcDuration: (text) => Math.max(1050, text.length * 60 + 550),
    },
    water: {
      type: 'simple',
      calcDuration: (text) => Math.max(900, text.length * 55 + 400),
    },
    echo: {
      type: 'simple',
      calcDuration: (text) => Math.max(850, text.length * 75 + 420),
    },
    mirror: {
      type: 'simple',
      calcDuration: (text) => Math.max(950, text.length * 55 + 450),
    },
    grow: {
      type: 'simple',
      calcDuration: (text) => Math.max(600, text.length * 60 + 260),
    },
    fire: {
      type: 'syllabic',
      calcDuration: (text) => Math.max(850, BRTags.splitIntoSyllables(text).length * 180 + 350),
    },
    pulse: {
      type: 'syllabic',
      calcDuration: (text) => BRTags.calcSyllabicDuration(text),
    },
    ripple: {
      type: 'syllabic',
      calcDuration: (text) => Math.max(900, BRTags.splitIntoSyllables(text).length * 170 + 400),
    },
  };

  private static calcMaskDuration (text: string): number {
    return Math.max(950, (text.length * 45 + 300) * 1.5);
  }

  private static calcSyllabicDuration (text: string): number {
    const syllables = this.splitIntoSyllables(text).length;
    return syllables * 190 + (syllables > 1 ? 280 : 0);
  }

  private static parseDurationParam (param?: string): number | null {
    if (!param) {
      return null;
    }
    const parsed = parseInt(param, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  // ============================================================================
  // ПУБЛИЧНЫЙ API
  // ============================================================================

  public static getType (tag: string): BREffectType {
    return this.registry[tag]?.type ?? 'simple';
  }

  public static calcDuration (tag: string, text: string, param?: string): number {
    const meta = this.registry[tag];
    const type = meta?.type ?? 'simple';

    if (type !== 'syllabic') {
      const customDuration = this.parseDurationParam(param);
      if (customDuration !== null) {
        return customDuration;
      }
    }

    return meta ? meta.calcDuration(text, param) : Math.max(450, text.length * 45 + 300);
  }

  public static splitIntoSyllables (text: string): string[] {
    const vowelRegex = /[аеёиоуыэюяaeiouy]/i;
    const chars = Array.from(text);
    const vowelIndices: number[] = [];

    for (let i = 0; i < chars.length; i++) {
      if (vowelRegex.test(chars[i])) {
        vowelIndices.push(i);
      }
    }

    if (vowelIndices.length <= 1) {
      return [text];
    }

    const parts: string[] = [];
    let start = 0;

    for (let v = 0; v < vowelIndices.length - 1; v++) {
      const curVowel = vowelIndices[v];
      const nextVowel = vowelIndices[v + 1];

      let splitAt = -1;
      for (let k = nextVowel - 1; k > curVowel; k--) {
        if (chars[k] === ' ') {
          splitAt = k + 1;
          break;
        }
      }

      if (splitAt === -1) {
        const consonantsBetween = nextVowel - curVowel - 1;
        splitAt = consonantsBetween > 1 ? curVowel + 2 : curVowel + 1;
      }

      parts.push(chars.slice(start, splitAt).join(''));
      start = splitAt;
    }

    parts.push(chars.slice(start).join(''));
    return parts.filter(p => p.length > 0);
  }
}
