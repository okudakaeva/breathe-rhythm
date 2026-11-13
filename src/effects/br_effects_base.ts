import { BRColor, BRContext, BREffectType, BREngineConfig } from '../types.ts';
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

export class BREffectBase {
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
    return match ? parseFloat(match[1]) : 28;
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
      const py = opts.pivotY ?? opts.y - 8;
      ctx.translate(px, py);
      ctx.scale(opts.scale, opts.scale);
      ctx.translate(-px, -py);
    }

    ctx.fillStyle = `rgba(${ opts.rgbVal }, ${ opts.rgbVal }, ${ opts.rgbVal }, ${ opts.alpha })`;
    if (opts.shadowBlur && opts.shadowBlur > 0) {
      ctx.shadowColor = (opts.shadowColor ?? '#ffffff') as string;
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
      color: string = '#ffffff',
      glowBlur: number = 16
  ): BRTextSprite {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.font = font;
    const textWidth = Math.ceil(ctx.measureText(text).width);
    const fontSize = this.extractFontSize(font);

    const padX = 24;
    const padY = Math.ceil(fontSize * 0.9);
    const width = Math.max(10, textWidth + padX * 2);
    const height = Math.max(10, Math.ceil(fontSize * 1.8) + padY * 2);
    const baselineY = padY + fontSize;

    const buildLayer = (withGlow: boolean): HTMLCanvasElement => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const octx = canvas.getContext('2d');
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
      config: BREngineConfig,
      dpr: number,
      text: string,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      progress: number,
      revealStart: number,
      useCubic: boolean = true,
      glowBlur: number = 0
  ): void {
    const reveal = this.clamp01((progress - revealStart) / (1 - revealStart));
    if (reveal <= 0.01) {
      return;
    }

    const ease = useCubic ? this.easeOutCubic(reveal) : this.easeOutQuad(reveal);
    this.drawStyledText(ctx, text, {
      x: startX,
      y,
      rgbVal,
      alpha: baseOpacity * ease,
      shadowColor: glowBlur > 0 ? config.shadowColor : undefined,
      shadowBlur: glowBlur > 0 ? (1 - ease) * glowBlur * dpr : 0,
    });
  }

  public static drawCharReveal (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
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
        glowBlur?: number;
        alphaMod?: (ease: number) => number;
      } = {}
  ): void {
    const spreadRatio = opts.spreadRatio ?? 0.65;
    const startOffset = opts.startOffset ?? 0;
    const revealDur = opts.revealDur ?? 0.25;
    const glowBlur = opts.glowBlur ?? 0;

    const chars = Array.from(segment.text);
    const total = Math.max(1, chars.length);
    let cursorX = startX;

    for (let c = 0; c < chars.length; c++) {
      const ch = chars[c];
      const chW = segment.charWidths?.[c] ?? ctx.measureText(ch).width;
      const charStart = (total > 1 ? (c / total) * spreadRatio : 0) + startOffset;
      const charReveal = this.clamp01((progress - charStart) / revealDur);

      if (charReveal > 0.01) {
        const ease = this.easeOutQuad(charReveal);
        const alpha = opts.alphaMod ? opts.alphaMod(ease) : ease;
        this.drawStyledText(ctx, ch, {
          x: cursorX,
          y,
          rgbVal,
          alpha: baseOpacity * alpha,
          shadowColor: glowBlur > 0 ? config.shadowColor : undefined,
          shadowBlur: glowBlur > 0 ? (1 - ease) * glowBlur * dpr : 0,
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
}
