import { BRParserConfig, BRToken, BRTemplate } from './types.ts';
import { BRTags } from './br_tags.ts';

export interface BRParserRules {
  hellip: string[];
  dash: string[];
  ending: string[];
  separators: string[];
  colon: string[];
  pause: BRTemplate;
  effect: BRTemplate;
}

export const BR_PARSER_CONFIG: BRParserConfig = {
  char: 70,
  hellip: 1500,
  dash: 700,
  ending: 500,
  separators: 400,
  colon: 700
};

export const BR_PARSER_RULES: BRParserRules = {
  hellip: ['…', '...'],
  dash: ['-', '—'],
  ending: ['.', '!', '?'],
  separators: [',', ';'],
  colon: [':'],
  pause: {
    open: '[',
    close: ']',
  },
  effect: {
    open: '{',
    close: '}'
  },
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

  private static parseTag (
      tagName: string,
      innerText: string,
      param: string | undefined,
      rules: BRParserRules
  ): BRToken[] {
    const openEsc = this.escapeRegExp(rules.pause.open);
    const closeEsc = this.escapeRegExp(rules.pause.close);
    const pauseRegex = new RegExp(`${ openEsc }(\\d+)${ closeEsc }`, 'g');

    const cleanText = innerText.replace(pauseRegex, '');
    const totalDuration = BRTags.calcDuration(tagName, cleanText, param);
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
          delay: Math.max(150, Math.round(totalDuration * (chunk.length / totalChars))),
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
            : Math.max(150, Math.round(totalDuration * (tailChunk.length / totalChars))),
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
    let i = 0;

    while (i < lineStr.length) {
      const current = lineStr[i];
      const next = lineStr[i + 1];
      const third = lineStr[i + 2];
      const isHellip = rules.hellip.includes(current);
      const isDash = rules.dash.includes(next);

      if (current === '<') {
        const tagMatch = lineStr.slice(i).match(/^<([a-zA-Z0-9_-]+)(?::([^>]+))?>([\s\S]*?)<\/\1>/);

        if (tagMatch) {
          const [fullMatch, tagName, rawParam, innerText] = tagMatch;
          const param = rawParam?.trim();
          tokens.push(...this.parseTag(tagName, innerText, param, rules));
          i += fullMatch.length;
          continue;
        }
      }

      if (current === rules.pause.open) {
        const end = lineStr.indexOf(rules.pause.close, i + 1);
        if (end !== -1) {
          const parsed = parseInt(lineStr.substring(i + 1, end), 10);
          const ms = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
          tokens.push({ type: 'pause', value: '', delay: ms });
          i = end + 1;
          continue;
        }
      }

      if (current === rules.effect.open) {
        const end = lineStr.indexOf(rules.effect.close, i + 1);
        if (end !== -1) {
          const effect = lineStr.substring(i + 1, end).trim();
          tokens.push({ type: 'effect', value: effect, delay: 0 });
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
        tokens.push({ type: 'char', value: current, delay: current === ' ' ? Math.round(config.char * 0.5) : config.char });
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
}
