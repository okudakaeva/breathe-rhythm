import { BREffectType, BRParserConfig } from './types.ts';
import { brDict } from './br_dictionary.ts';

export interface BRTagMeta {
  type: BREffectType;
  calcDuration: (text: string, config: BRParserConfig, param?: string) => number;
}

export class BRTags {
  private static readonly registry: Record<string, BRTagMeta> = {
    fireflies: {
      type: 'mask',
      calcDuration: (text, cfg) => BRTags.calcMaskDuration(text, cfg, brDict['FIREFLIES_MIN_DURATION'], brDict['FIREFLIES_PAD_DURATION']),
    },
    sand: {
      type: 'mask',
      calcDuration: (text, cfg) => BRTags.calcMaskDuration(text, cfg, brDict['SAND_MIN_DURATION'], brDict['SAND_PAD_DURATION']),
    },
    glitter: {
      type: 'mask',
      calcDuration: (text, cfg) => Math.max(brDict['GLITTER_MIN_DURATION'], text.length * cfg.char + brDict['GLITTER_PAD_DURATION']),
    },
    breeze: {
      type: 'mask',
      calcDuration: (text, cfg) => BRTags.calcMaskDuration(text, cfg, brDict['BREEZE_MIN_DURATION'], brDict['BREEZE_PAD_DURATION']),
    },
    frost: {
      type: 'mask',
      calcDuration: (text, cfg) => BRTags.calcMaskDuration(text, cfg, brDict['FROST_MIN_DURATION'], brDict['FROST_PAD_DURATION']),
    },
    constellation: {
      type: 'mask',
      calcDuration: (text, cfg) => Math.max(brDict['CONSTELLATION_MIN_DURATION'], text.length * cfg.char + brDict['CONSTELLATION_PAD_DURATION']),
    },
    wind: {
      type: 'particles',
      calcDuration: (text, cfg) => Math.max(brDict['WIND_MIN_DURATION'], text.length * cfg.char + brDict['WIND_PAD_DURATION']),
    },
    embers: {
      type: 'particles',
      calcDuration: (text, cfg) => Math.max(brDict['EMBERS_MIN_DURATION'], text.length * cfg.char + brDict['EMBERS_PAD_DURATION']),
    },
    snow: {
      type: 'particles',
      calcDuration: (text, cfg) => Math.max(brDict['SNOW_MIN_DURATION'], text.length * cfg.char + brDict['SNOW_PAD_DURATION']),
    },
    sparks: {
      type: 'particles',
      calcDuration: (text, cfg) => Math.max(brDict['SPARKS_MIN_DURATION'], text.length * cfg.char + brDict['SPARKS_PAD_DURATION']),
    },
    dandelion: {
      type: 'particles',
      calcDuration: (text, cfg) => Math.max(brDict['DANDELION_MIN_DURATION'], text.length * cfg.char + brDict['DANDELION_PAD_DURATION']),
    },
    water: {
      type: 'simple',
      calcDuration: (text, cfg) => Math.max(brDict['WATER_MIN_DURATION'], text.length * cfg.char + brDict['WATER_PAD_DURATION']),
    },
    echo: {
      type: 'simple',
      calcDuration: (text, cfg) => Math.max(brDict['ECHO_MIN_DURATION'], text.length * cfg.char + brDict['ECHO_PAD_DURATION']),
    },
    mirror: {
      type: 'simple',
      calcDuration: (text, cfg) => Math.max(brDict['MIRROR_MIN_DURATION'], text.length * cfg.char + brDict['MIRROR_PAD_DURATION']),
    },
    grow: {
      type: 'simple',
      calcDuration: (text, cfg) => Math.max(brDict['GROW_MIN_DURATION'], text.length * cfg.char + brDict['GROW_PAD_DURATION']),
    },
    fire: {
      type: 'syllabic',
      calcDuration: (text, cfg) => Math.max(brDict['FIRE_MIN_DURATION'], BRTags.calcSyllabicDuration(text, cfg, brDict['FIRE_PAD_DURATION'])),
    },
    pulse: {
      type: 'syllabic',
      calcDuration: (text, cfg) => BRTags.calcSyllabicDuration(text, cfg, brDict['SYLLABIC_PAD_DURATION']),
    },
    ripple: {
      type: 'syllabic',
      calcDuration: (text, cfg) => Math.max(brDict['RIPPLE_MIN_DURATION'], BRTags.calcSyllabicDuration(text, cfg, brDict['RIPPLE_PAD_DURATION'])),
    },
    sparkle: {
      type: 'syllabic',
      calcDuration: (text, cfg) => BRTags.calcSyllabicDuration(text, cfg, brDict['SYLLABIC_PAD_DURATION']),
    },
    orbit: {
      type: 'syllabic',
      calcDuration: (text, cfg) => BRTags.calcSyllabicDuration(text, cfg, brDict['SYLLABIC_PAD_DURATION']),
    },
  };

  private static calcMaskDuration (text: string, cfg: BRParserConfig, minDuration: number, padDuration: number): number {
    return Math.round(Math.max(minDuration, text.length * cfg.char + padDuration));
  }

  private static calcSyllabicDuration (text: string, cfg: BRParserConfig, padDuration: number): number {
    const syllables = this.splitIntoSyllables(text).length;
    return Math.round(syllables * cfg.char * brDict['SYLLABIC_RATIO'] + (syllables > 1 ? padDuration : 0));
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

  public static hasTag (tag: string): boolean {
    return tag in this.registry;
  }

  public static getType (tag: string): BREffectType {
    return this.registry[tag]?.type ?? 'simple';
  }

  public static calcDuration (tag: string, text: string, config: BRParserConfig, param?: string): number {
    const meta = this.registry[tag];
    const type = meta?.type ?? 'simple';

    if (type !== 'syllabic') {
      const customDuration = this.parseDurationParam(param);
      if (customDuration !== null) {
        return customDuration;
      }
    }

    return Math.round(
        meta
            ? meta.calcDuration(text, config, param)
            : Math.max(brDict['DEFAULT_MIN_DURATION'], text.length * config.char + brDict['DEFAULT_PAD_DURATION'])
    );
  }

  public static splitIntoSyllables (text: string): string[] {
    const vowelRegex = /[аеёиоуыэюяaeiouy]/i;
    const chunks = text.match(/(\S+\s*|\s+)/g) ?? [text];
    const parts: string[] = [];

    for (const chunk of chunks) {
      const chars = Array.from(chunk);
      const vowelIndices: number[] = [];

      for (let i = 0; i < chars.length; i++) {
        if (vowelRegex.test(chars[i])) {
          vowelIndices.push(i);
        }
      }

      if (vowelIndices.length <= 1) {
        parts.push(chunk);
        continue;
      }

      let start = 0;
      for (let v = 0; v < vowelIndices.length - 1; v++) {
        const curVowel = vowelIndices[v];
        const nextVowel = vowelIndices[v + 1];
        const consonantsBetween = nextVowel - curVowel - 1;
        const splitAt = consonantsBetween > 1 ? curVowel + 2 : curVowel + 1;

        parts.push(chars.slice(start, splitAt).join(''));
        start = splitAt;
      }

      parts.push(chars.slice(start).join(''));
    }

    return parts.filter(p => p.length > 0);
  }
}
