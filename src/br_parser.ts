import { BRParserConfig, BRTemplate, BRToken } from './types.ts';
import { BRTags } from './br_tags.ts';
import { brDict } from './br_dictionary.ts';

export interface BRParserRules {
  hellip: string[];
  dash: string[];
  ending: string[];
  separators: string[];
  colon: string[];
  pause: BRTemplate;
  effect: BRTemplate;
  tag: BRTemplate;
}

export const BR_PARSER_CONFIG: BRParserConfig = {
  char: 70,
  hellip: 1500,
  dash: 700,
  ending: 500,
  separators: 400,
  colon: 700,
};

export const BR_PARSER_RULES: BRParserRules = {
  hellip: ['…', '...'],
  dash: ['-', '—'],
  ending: ['.', '!', '?'],
  separators: [',', ';'],
  colon: [':'],
  pause: {
    open: '{',
    close: '}',
  },
  effect: {
    open: '{',
    close: '}',
  },
  tag: {
    open: '<',
    close: '>',
    end: '/',
  }
};

export class BRParser {
  private static getSymbols (): string[] {
    return [
      ...BR_PARSER_RULES.hellip.filter(s => s.length === 1),
      ...BR_PARSER_RULES.ending,
      ...BR_PARSER_RULES.separators,
    ];
  }

  private static escapeRegExp (str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private static getTempoScale (tagName: string, param?: string): number {
    const parsed = param ? parseFloat(param) : NaN;
    const rawScale = Number.isFinite(parsed) && parsed > 0 ? parsed : brDict['DEFAULT_TEMPO_FACTOR'];

    if (tagName === 'fast') {
      return Math.min(brDict['MAX_FAST_SCALE'], Math.max(brDict['MIN_TEMPO_FACTOR'], rawScale));
    }

    return Math.min(brDict['MAX_TEMPO_FACTOR'], Math.max(brDict['MIN_TEMPO_FACTOR'], rawScale));
  }

  private static applyTempo (delay: number, tagName: string, scale: number): number {
    const delta = delay * scale;
    const result = tagName === 'fast' ? delay - delta : delay + delta;
    return Math.max(1, Math.round(result));
  }

  private static scaleConfig (config: BRParserConfig, tagName: string, scale: number): BRParserConfig {
    return {
      char: this.applyTempo(config.char, tagName, scale),
      hellip: this.applyTempo(config.hellip, tagName, scale),
      dash: this.applyTempo(config.dash, tagName, scale),
      ending: this.applyTempo(config.ending, tagName, scale),
      separators: this.applyTempo(config.separators, tagName, scale),
      colon: this.applyTempo(config.colon, tagName, scale),
    };
  }

  private static parseTag (
      tagName: string,
      innerText: string,
      param: string | undefined,
      config: BRParserConfig,
      rules: BRParserRules
  ): BRToken[] {
    const openEsc = this.escapeRegExp(rules.pause.open);
    const closeEsc = this.escapeRegExp(rules.pause.close);
    const pauseRegex = new RegExp(`${ openEsc }(\\d+)${ closeEsc }`, 'g');

    const cleanText = innerText.replace(pauseRegex, '');
    const totalDuration = BRTags.calcDuration(tagName, cleanText, config, param);
    const totalChars = Math.max(1, cleanText.length);

    const result: BRToken[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pauseRegex.exec(innerText)) !== null) {
      const chunk = innerText.slice(lastIndex, match.index);

      if (chunk.length > 0) {
        result.push({
          type: 'tag',
          tag: tagName,
          param,
          value: chunk,
          delay: Math.max(brDict['MIN_TAG_CHUNK_DELAY'], Math.round(totalDuration * (chunk.length / totalChars))),
        });
      }

      const parsed = parseInt(match[1], 10);
      const ms = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      result.push({ type: 'pause', value: '', delay: ms });

      lastIndex = match.index + match[0].length;
    }

    const tailChunk = innerText.slice(lastIndex);

    if (tailChunk.length > 0) {
      result.push({
        type: 'tag',
        tag: tagName,
        param,
        value: tailChunk,
        delay: lastIndex === 0
            ? totalDuration
            : Math.max(brDict['MIN_TAG_CHUNK_DELAY'], Math.round(totalDuration * (tailChunk.length / totalChars))),
      });
    }

    return result;
  }

  // ============================================================================
  // ПУБЛИЧНЫЙ API
  // ============================================================================

  public static parse (
      lineStr: string,
      config: BRParserConfig = BR_PARSER_CONFIG,
      rules: BRParserRules = BR_PARSER_RULES
  ): BRToken[] {
    const tokens: BRToken[] = [];
    const tagRegex = BRParser.getTagRegex(rules.tag);
    let i = 0;

    while (i < lineStr.length) {
      const current = lineStr[i];
      const next = lineStr[i + 1];
      const third = lineStr[i + 2];
      const isHellip = rules.hellip.includes(current);
      const isDash = rules.dash.includes(next);

      if (current === rules.tag.open) {
        const tagMatch = lineStr.slice(i).match(tagRegex);

        if (tagMatch) {
          const [fullMatch, tagName, rawParam, innerText] = tagMatch;
          const param = rawParam?.trim();

          if (tagName === 'fast' || tagName === 'slow') {
            const scale = this.getTempoScale(tagName, param);
            tokens.push(...this.parse(innerText, this.scaleConfig(config, tagName, scale), rules));
          } else {
            tokens.push(...this.parseTag(tagName, innerText, param, config, rules));
          }

          i += fullMatch.length;
          continue;
        }
      }

      if (current === rules.pause.open || current === rules.effect.open) {
        const closeChar = current === rules.pause.open ? rules.pause.close : rules.effect.close;
        const end = lineStr.indexOf(closeChar, i + 1);

        if (end !== -1) {
          const inner = lineStr.substring(i + 1, end).trim();
          const isPause = /^\d+$/.test(inner);

          if (isPause) {
            tokens.push({ type: 'pause', value: '', delay: parseInt(inner, 10) });
          } else if (inner.length > 0) {
            tokens.push({ type: 'effect', value: inner, delay: 0 });
          }

          i = end + 1;
          continue;
        }
      }

      if (isHellip || rules.hellip.includes(`${ current }${ next }${ third }`)) {
        tokens.push({ type: 'hellip', value: '...', delay: config.hellip });
        i += isHellip ? 1 : 3;
      } else if (current === ' ' && isDash && third === ' ') {
        tokens.push({ type: 'char', value: ' ', delay: config.dash });
        tokens.push({ type: 'dash', value: '—', delay: config.char });
        tokens.push({ type: 'char', value: ' ', delay: config.char });
        i += 3;
      } else if (rules.ending.includes(current)) {
        tokens.push({ type: 'ending', value: current, delay: config.ending });
        i++;
      } else if (rules.separators.includes(current)) {
        tokens.push({ type: 'separators', value: current, delay: config.separators });
        i++;
      } else if (rules.colon.includes(current)) {
        tokens.push({ type: 'colon', value: current, delay: config.colon });
        i++;
      } else {
        tokens.push({
          type: 'char',
          value: current,
          delay: current === ' ' ? Math.round(config.char * brDict['SPACE_DELAY_RATIO']) : config.char
        });
        i++;
      }
    }

    return tokens;
  }

  public static getWordFinishedTest (): RegExp {
    const stickySymbols = BRParser.getSymbols();
    const escapedSymbols = stickySymbols.map(s => (s === '.' ? `\\${ s }` : s)).join('');

    return new RegExp(`[${ escapedSymbols }]$`);
  }

  private static getTagRegex (tagRule: BRTemplate): RegExp {
    const open = this.escapeRegExp(tagRule.open);
    const close = this.escapeRegExp(tagRule.close);
    const end = this.escapeRegExp(tagRule.end ?? '/');

    return new RegExp(`^${ open }([a-zA-Z0-9_-]+)(?::([^${ close }]+))?${ close }([\\s\\S]*?)${ open }${ end }\\1${ close }`);
  }
}
