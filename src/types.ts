export type BRTokenType = 'char' | 'hellip' | 'dash' | 'pause' | 'effect' | 'ending' | 'separators' | 'colon' | 'tag';
export type BREffectType = 'syllabic' | 'mask' | 'particles' | 'simple';
export type BRColor = string | CanvasGradient | CanvasPattern;
export type BRContext = CanvasRenderingContext2D;
export type BRTemplate = { open: string; close: string };

export interface BREngineConfig {
  bgColor: string;
  textColor: number;
  activeTextColor: string;
  shadowColor: string;
  finishedShadowColor: string;
  font: string;
  paddingX: number;
  lineHeight: number;
  initialY: number;
  lineEndDelay: number;
  finalDelay: number;
  maxShadowBlur: number;
}

export interface BRParserConfig {
  char: number;
  hellip: number;
  dash: number;
  ending: number;
  separators: number;
  colon: number;
}

export interface BRToken {
  type: BRTokenType;
  value: string;
  delay: number;
  tag?: string;
  param?: string;
}
