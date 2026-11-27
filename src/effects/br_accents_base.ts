import { BRColor, BRContext, BREffectType } from '../types.ts';
import { brDict } from '../br_dictionary.ts';

export interface BRFlowParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  waveAmp: number;
  waveFreq: number;
  phase: number;
  delayRatio: number;
  lifeWindow: number;
  alphaMax: number;
}

export interface BRMaskParticle {
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  size: number;
  zigzagFreq: number;
  zigzagAmp: number;
  phase: number;
  delayRatio: number;
  pulseSpeed: number;
}

export interface BRWindGustParticle {
  startX: number;
  endX: number;
  baseY: number;
  size: number;
  waveAmp: number;
  waveFreq: number;
  phase: number;
  delayRatio: number;
  speedMulti: number;
  alphaMax: number;
}

export interface BRTextSprite {
  canvas: HTMLCanvasElement;
  glowCanvas: HTMLCanvasElement;
  padX: number;
  baselineY: number;
  width: number;
  height: number;
}

export interface BRRenderSegment {
  text: string;
  tag?: string;
  param?: string;
  type?: BREffectType;
  progress: number;
  duration: number;
  finishedAt?: number;
  totalWidth?: number;
  charWidths?: number[];
  syllableWidths?: number[];
  grains?: BRMaskParticle[];
  constellationLinks?: Array<[number, number]>;
  gusts?: BRWindGustParticle[];
  syllables?: string[];
  sprite?: BRTextSprite;
  flowParticles?: BRFlowParticle[];
}

export interface BRTextDrawOptions {
  x: number;
  y: number;
  rgbVal: number;
  alpha: number;
  shadowColor?: BRColor;
  shadowBlur?: number;
  scale?: number;
  pivotX?: number;
  pivotY?: number;
}

const CONFIG = {
  CORE_RADIUS: 4,
  DEFAULT_COLOR: '#ffffff',
  DEFAULT_PIVOT_Y_OFFSET: 8,
  SPRITE_PAD_Y_RATIO: 0.9,
  MIN_OPACITY: 0.01,
  MIN_ALPHA: 0.005,
  DEFAULT_DOT_BLUR: 14,
  CHAR_REVEAL: {
    spreadRatio: 0.65,
    startOffset: 0,
    revealDur: 0.25,
  },
} as const;

export class BRAccentsBase {
  private static glowDotCache: Map<string, { canvas: HTMLCanvasElement; size: number }> = new Map();

  public static clamp01 (v: number): number {
    return Math.max(0, Math.min(1, v));
  }

  public static easeOutCubic (t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public static easeOutQuad (t: number): number {
    return 1 - Math.pow(1 - t, 2);
  }

  public static extractFontSize (font: string): number {
    const match = font.match(/^(\d+(?:\.\d+)?)px/);
    return match ? parseFloat(match[1]) : brDict['BASE_FONT_SIZE'];
  }

  public static fallbackText (
      ctx: BRContext,
      text: string,
      startX: number,
      y: number,
      rgbVal: number,
      alpha: number
  ): number {
    const width = ctx.measureText(text).width;

    this.drawStyledText(ctx, text, { x: startX, y, rgbVal, alpha });

    return width;
  }

  public static drawStyledText (ctx: BRContext, text: string, opts: BRTextDrawOptions): void {
    ctx.save();

    if (opts.scale !== undefined && opts.scale !== 1) {
      const px = opts.pivotX ?? opts.x;
      const py = opts.pivotY ?? opts.y - CONFIG.DEFAULT_PIVOT_Y_OFFSET;
      ctx.translate(px, py);
      ctx.scale(opts.scale, opts.scale);
      ctx.translate(-px, -py);
    }

    ctx.fillStyle = `rgba(${ opts.rgbVal }, ${ opts.rgbVal }, ${ opts.rgbVal }, ${ opts.alpha })`;

    if (opts.shadowBlur && opts.shadowBlur > 0) {
      ctx.shadowColor = (opts.shadowColor ?? CONFIG.DEFAULT_COLOR) as string;
      ctx.shadowBlur = opts.shadowBlur;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.fillText(text, opts.x, opts.y);
    ctx.restore();
  }

  public static createTextSprite (
      ctx: BRContext,
      font: string,
      text: string,
      color: string = CONFIG.DEFAULT_COLOR,
      glowBlur: number = brDict['SPRITE_GLOW_BLUR']
  ): BRTextSprite {
    ctx.font = font;

    const dpr = brDict['DPR'];
    const textWidth = Math.ceil(ctx.measureText(text).width);
    const fontSize = this.extractFontSize(font);

    const padX = brDict['SPRITE_PAD_X'];
    const padY = Math.ceil(fontSize * CONFIG.SPRITE_PAD_Y_RATIO);
    const width = Math.max(brDict['SPRITE_MIN_SIZE'], textWidth + padX * 2);
    const height = Math.max(brDict['SPRITE_MIN_SIZE'], Math.ceil(fontSize * brDict['SPRITE_LINE_RATIO']) + padY * 2);
    const baselineY = padY + fontSize;

    const buildLayer = (withGlow: boolean): HTMLCanvasElement => {
      const canvas = document.createElement('canvas');
      const octx = canvas.getContext(brDict['CONTEXT']);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      if (octx) {
        octx.scale(dpr, dpr);
        octx.font = font;
        octx.textAlign = 'left';
        octx.textBaseline = 'alphabetic';
        octx.fillStyle = color;
        if (withGlow) {
          octx.shadowColor = color;
          octx.shadowBlur = glowBlur;
        }
        octx.fillText(text, padX, baselineY);
      }

      return canvas;
    };

    return {
      canvas: buildLayer(false),
      glowCanvas: buildLayer(true),
      padX,
      baselineY,
      width,
      height,
    };
  }

  public static disposeTextSprite (sprite?: BRTextSprite): void {
    if (!sprite) {
      return;
    }

    sprite.canvas.width = 0;
    sprite.canvas.height = 0;
    sprite.glowCanvas.width = 0;
    sprite.glowCanvas.height = 0;
  }

  public static getSegmentWidth (ctx: BRContext, segment: BRRenderSegment): number {
    segment.totalWidth ??= ctx.measureText(segment.text).width;
    return segment.totalWidth;
  }

  public static fadeOutWindow (progress: number, start: number): number {
    return 1 - this.clamp01((progress - start) / (1 - start));
  }

  public static drawTextReveal (
      ctx: BRContext,
      text: string,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      progress: number,
      revealStart: number,
      useCubic: boolean = true
  ): void {
    const reveal = this.clamp01((progress - revealStart) / (1 - revealStart));

    if (reveal <= CONFIG.MIN_OPACITY) {
      return;
    }

    const ease = useCubic ? this.easeOutCubic(reveal) : this.easeOutQuad(reveal);

    this.drawStyledText(ctx, text, {
      x: startX,
      y,
      rgbVal,
      alpha: baseOpacity * ease,
    });
  }

  public static drawCharReveal (
      ctx: BRContext,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      progress: number,
      opts: {
        spreadRatio?: number;
        startOffset?: number;
        revealDur?: number;
        alphaMod?: (ease: number) => number;
      } = {}
  ): void {
    const defaults = CONFIG.CHAR_REVEAL;
    const spreadRatio = opts.spreadRatio ?? defaults.spreadRatio;
    const startOffset = opts.startOffset ?? defaults.startOffset;
    const revealDur = opts.revealDur ?? defaults.revealDur;

    const chars = Array.from(segment.text);
    const total = Math.max(1, chars.length);
    let cursorX = startX;

    for (let c = 0; c < chars.length; c++) {
      const ch = chars[c];
      const chW = segment.charWidths?.[c] ?? ctx.measureText(ch).width;
      const charStart = (total > 1 ? (c / total) * spreadRatio : 0) + startOffset;
      const charReveal = this.clamp01((progress - charStart) / revealDur);

      if (charReveal > CONFIG.MIN_OPACITY) {
        const ease = this.easeOutQuad(charReveal);
        const alpha = opts.alphaMod ? opts.alphaMod(ease) : ease;
        this.drawStyledText(ctx, ch, {
          x: cursorX,
          y,
          rgbVal,
          alpha: baseOpacity * alpha,
        });
      }

      cursorX += chW;
    }
  }

  public static drawMaskOrFallback (
      ctx: BRContext,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      render: (grains: BRMaskParticle[], textWidth: number) => void
  ): number {
    const textWidth = this.getSegmentWidth(ctx, segment);
    const grains = segment.grains;

    if (!grains || grains.length === 0) {
      return this.fallbackText(ctx, segment.text, startX, y, rgbVal, baseOpacity * segment.progress);
    }

    render(grains, textWidth);

    return textWidth;
  }

  public static isMobileViewport (): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.innerWidth < brDict['MOBILE_BREAKPOINT'] || navigator.maxTouchPoints > 0;
  }

  public static getGlowDot (color: string = CONFIG.DEFAULT_COLOR, blur: number = CONFIG.DEFAULT_DOT_BLUR): { canvas: HTMLCanvasElement; size: number } {
    const key = `${ color }_${ blur }`;
    const cached = this.glowDotCache.get(key);

    if (cached) {
      return cached;
    }

    const dpr = brDict['DPR'];
    const size = Math.ceil((CONFIG.CORE_RADIUS + blur) * 2);
    const canvas = document.createElement('canvas');
    const octx = canvas.getContext(brDict['CONTEXT']);

    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    if (octx) {
      octx.scale(dpr, dpr);
      octx.fillStyle = color;
      octx.shadowColor = color;
      octx.shadowBlur = blur;
      octx.beginPath();
      octx.arc(size / 2, size / 2, CONFIG.CORE_RADIUS, 0, Math.PI * 2);
      octx.fill();
    }

    const entry = { canvas, size };

    this.glowDotCache.set(key, entry);

    return entry;
  }

  public static drawGlowDot (
      ctx: BRContext,
      dot: { canvas: HTMLCanvasElement; size: number },
      x: number,
      y: number,
      radius: number,
      alpha: number
  ): void {
    if (alpha <= CONFIG.MIN_ALPHA) {
      return;
    }

    const drawSize = dot.size * (radius / CONFIG.CORE_RADIUS);

    ctx.globalAlpha = alpha;
    ctx.drawImage(dot.canvas, x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
  }
}
