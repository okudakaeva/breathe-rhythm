import { BRContext, BREngineConfig } from './types.ts';
import { BREffectBase, BREffects, BRRenderSegment } from './effects/br_effects.ts';
import { brDict } from './br_dictionary.ts';

export interface BRCtxMetrics {
  font: string;
  paddingX: number;
  lineHeight: number;
  initialY: number;
}

export interface RenderLine {
  text: string;
  rendered: string;
  segments: BRRenderSegment[];
  isTyping: boolean;
  fadeFactor: number;
}

export class BRRenderer {
  private readonly ctx: BRContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly engineConfig: BREngineConfig;
  private readonly wordFinishedTest: RegExp;

  private readonly lines: RenderLine[] = [];
  private metrics: BRCtxMetrics = { font: '', paddingX: 0, lineHeight: 0, initialY: 0 };

  private activeLineIdx: number = 0;
  private currentScrollY: number = 0;
  private isFinished: boolean = false;
  private isRunning: boolean = false;
  private dpr: number = 1;
  private lastDrawTime: number = performance.now();

  constructor (initializer: {
    canvas: HTMLCanvasElement;
    lines: RenderLine[];
    engineConfig: BREngineConfig;
    wordFinishedTest: RegExp;
  }) {
    this.canvas = initializer.canvas;
    this.ctx = this.canvas.getContext(brDict['CONTEXT'])!;
    this.lines = initializer.lines;
    this.engineConfig = initializer.engineConfig;
    this.wordFinishedTest = initializer.wordFinishedTest;

    this.reset();
    this.updateResponsiveMetrics();
  }

  private get logicalWidth (): number {
    return this.canvas.width / this.dpr;
  }

  private get logicalHeight (): number {
    return this.canvas.height / this.dpr;
  }

  private getTargetScrollY (): number {
    const scrollIndex = Math.min(this.activeLineIdx, Math.max(0, this.lines.length - 1));
    const bottomReserve = this.engineConfig.paddingBottom + this.metrics.lineHeight * 0.5;
    const availableHeight = this.logicalHeight - this.metrics.initialY - bottomReserve;
    const visibleRowsCount = Math.max(1, Math.floor(availableHeight / this.metrics.lineHeight));
    return Math.max(0, (scrollIndex - (visibleRowsCount - 1)) * this.metrics.lineHeight);
  }

  private updateScroll (): void {
    const targetScrollY = this.getTargetScrollY();
    const diff = targetScrollY - this.currentScrollY;

    if (Math.abs(diff) <= 0.1) {
      this.currentScrollY = targetScrollY;
    } else {
      this.currentScrollY += diff * brDict['SCROLL_EASING'];
    }
  }

  private updateLineFadeFactor (line: RenderLine, index: number): number {
    const isLastLine = index === this.lines.length - 1;
    const isCurrentActive =
        index === this.activeLineIdx &&
        line.rendered.length > 0 &&
        (!isLastLine || line.isTyping || !this.isRunning);

    if (this.isFinished) {
      if (line.fadeFactor < brDict['FINISHED_LINE_FADE']) {
        line.fadeFactor = Math.min(brDict['FINISHED_LINE_FADE'], line.fadeFactor + brDict['LINE_FADE_IN_STEP']);
      }
    } else if (isCurrentActive) {
      line.fadeFactor = 1.0;
    } else if (line.fadeFactor > 0.0) {
      line.fadeFactor = Math.max(0.0, line.fadeFactor - brDict['LINE_FADE_OUT_STEP']);
    }

    return line.fadeFactor;
  }

  private getLineShadowBlur (fadeFactor: number): number {
    if (this.isFinished && fadeFactor < 0.4) {
      return Math.sin((fadeFactor / 0.4) * Math.PI) * this.engineConfig.maxShadowBlur;
    }

    return 0;
  }

  private clearCanvas (): void {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.canvas.style.backgroundColor = this.engineConfig.bgColor;
    this.ctx.fillStyle = this.engineConfig.bgColor;
    this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
    this.ctx.font = this.metrics.font;
    this.ctx.textAlign = 'left';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = 'transparent';
  }

  private drawActiveWord (text: string, x: number, y: number, rgbVal: number, opacity: number): void {
    const lastSpaceIdx = text.lastIndexOf(' ');
    const stableText = lastSpaceIdx !== -1 ? text.substring(0, lastSpaceIdx + 1) : '';
    const activeWord = lastSpaceIdx !== -1 ? text.substring(lastSpaceIdx + 1) : text;

    if (this.wordFinishedTest.test(activeWord)) {
      this.drawStaticLine(text, x, y, rgbVal, opacity, 0);
      return;
    }

    const stableWidth = stableText.length > 0 ? this.ctx.measureText(stableText).width : 0;

    this.ctx.fillStyle = `rgba(${ rgbVal }, ${ rgbVal }, ${ rgbVal }, ${ opacity })`;
    this.ctx.shadowBlur = 0;

    if (stableText.length > 0) {
      this.ctx.fillText(stableText, x, y);
    }

    this.ctx.save();
    this.ctx.fillStyle = this.engineConfig.activeTextColor;
    this.ctx.shadowColor = this.engineConfig.shadowColor;
    this.ctx.shadowBlur = brDict['ACTIVE_WORD_GLOW'] * this.dpr;
    this.ctx.fillText(activeWord, x + stableWidth, y);
    this.ctx.restore();
  }

  private drawStaticLine (text: string, x: number, y: number, rgbVal: number, opacity: number, shadowBlur: number): void {
    this.ctx.fillStyle = `rgba(${ rgbVal }, ${ rgbVal }, ${ rgbVal }, ${ opacity })`;
    this.ctx.shadowColor = this.engineConfig.finishedShadowColor;
    this.ctx.shadowBlur = shadowBlur * this.dpr;
    this.ctx.fillText(text, x, y);
  }

  private drawSegmentedLine (line: RenderLine, x: number, y: number, rgbVal: number, opacity: number): void {
    let cursorX = x;
    const now = performance.now();

    for (let s = 0; s < line.segments.length; s++) {
      const seg = line.segments[s];
      const isLastSegment = s === line.segments.length - 1;

      if (seg.progress < 1) {
        cursorX += BREffects.drawSegment(this.ctx, this.engineConfig, this.dpr, seg, cursorX, y, rgbVal, opacity);
      } else if (!seg.tag && isLastSegment && line.isTyping && !this.isFinished) {
        this.drawActiveWord(seg.text, cursorX, y, rgbVal, opacity);
        seg.totalWidth ??= this.ctx.measureText(seg.text).width;
        cursorX += seg.totalWidth;
      } else {
        let segRgb = rgbVal;

        if (seg.tag && seg.finishedAt !== undefined) {
          const settleT = Math.min(1, (now - seg.finishedAt) / brDict['SETTLE_DURATION']);
          segRgb = Math.round(255 + (rgbVal - 255) * settleT);
        }

        this.drawStaticLine(seg.text, cursorX, y, segRgb, opacity, 0);
        seg.totalWidth ??= this.ctx.measureText(seg.text).width;
        cursorX += seg.totalWidth;
      }
    }
  }

  private reset (): void {
    BREffects.reset();
    this.activeLineIdx = 0;
    this.currentScrollY = 0;
    this.isFinished = false;
    this.isRunning = false;
    this.lastDrawTime = performance.now();
  }

  // ============================================================================
  // ПУБЛИЧНЫЙ API
  // ============================================================================

  public get hasParticles (): boolean {
    return BREffects.hasParticles;
  }

  public get hasActiveFading (): boolean {
    const now = performance.now();

    return this.lines.some((line, i) =>
        (this.isFinished && line.fadeFactor < brDict['FINISHED_LINE_FADE']) ||
        (!this.isFinished && i !== this.activeLineIdx && line.fadeFactor > 0) ||
        line.segments.some(
            seg => seg.progress < 1 || (seg.finishedAt !== undefined && now - seg.finishedAt < brDict['SETTLE_DURATION'])
        )
    );
  }

  public get hasActiveScroll (): boolean {
    return Math.abs(this.getTargetScrollY() - this.currentScrollY) > 0.1;
  }

  public renderEffect (name: string): void {
    if (name === 'flash') {
      const x = this.logicalWidth / 2;
      const y = this.metrics.initialY + (this.activeLineIdx * this.metrics.lineHeight) - this.currentScrollY + 15;
      const spreadX = Math.min(brDict['FLASH_MIN_SPREAD'], this.logicalWidth - this.metrics.paddingX * 2);

      BREffects.triggerFlash(this.ctx, x, y, spreadX, brDict['FLASH_COUNT']);
    }
  }

  public drawFrame (): void {
    const now = performance.now();
    const dt = this.isRunning ? Math.min(now - this.lastDrawTime, 100) : 0;
    this.lastDrawTime = now;

    this.clearCanvas();
    BREffects.drawParticles(this.ctx);
    this.updateScroll();

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const x = this.metrics.paddingX;
      const y = this.metrics.initialY + (i * this.metrics.lineHeight) - this.currentScrollY;

      if (dt > 0) {
        for (const seg of line.segments) {
          if (seg.progress < 1) {
            seg.progress = Math.min(1, seg.progress + dt / seg.duration);

            if (seg.progress >= 1) {
              seg.finishedAt = now;
              BREffects.disposeSegment(seg);
            }
          }
        }
      }

      if (y < -this.metrics.lineHeight || y > this.logicalHeight + this.metrics.lineHeight) {
        continue;
      }

      const t = this.updateLineFadeFactor(line, i);
      const shadowBlur = this.getLineShadowBlur(t);
      const rgbVal = Math.round(this.engineConfig.textColor + (255 - this.engineConfig.textColor) * t);
      const opacity = brDict['DIMMED_LINE_OPACITY'] + ((1 - brDict['DIMMED_LINE_OPACITY']) * t);
      const hasAnimatedTag = line.segments.some(seg => Boolean(seg.tag));

      if (hasAnimatedTag && !this.isFinished) {
        this.drawSegmentedLine(line, x, y, rgbVal, opacity);
      } else if (line.isTyping && line.rendered.length > 0 && !this.isFinished) {
        this.drawActiveWord(line.rendered, x, y, rgbVal, opacity);
      } else {
        this.drawStaticLine(line.rendered, x, y, rgbVal, opacity, shadowBlur);
      }
    }
  }

  public updateResponsiveMetrics (): void {
    if (!this.canvas || !this.ctx) {
      return;
    }

    this.dpr = brDict['DPR'];

    const width = this.logicalWidth;
    const scale = Math.min(1, width / brDict['MOBILE_BREAKPOINT']);
    const fontMatch = this.engineConfig.font.match(/^(\d+(?:\.\d+)?)px\s+(.+)$/);
    const baseFontSize = fontMatch ? parseFloat(fontMatch[1]) : brDict['BASE_FONT_SIZE'];
    const fontFamily = fontMatch ? fontMatch[2] : brDict['BASE_FONT'];
    const paddingX = Math.max(brDict['MIN_PADDING_X'], Math.min(this.engineConfig.paddingX, Math.round(width * brDict['PADDING_X_RATIO'])));
    const maxWidth = Math.max(brDict['MIN_LINE_WIDTH'], width - paddingX * 2);
    let fontSize = Math.max(brDict['MOBILE_MIN_FONT_SIZE'], Math.round(baseFontSize * scale));

    if (this.lines.length > 0) {
      this.ctx.font = `${ fontSize }px ${ fontFamily }`;
      const longestLineWidth = Math.max(
          0,
          ...this.lines.map(line => this.ctx.measureText(line.text).width)
      );
      if (longestLineWidth > maxWidth) {
        fontSize = Math.max(brDict['MIN_FONT_SIZE'], Math.floor(fontSize * (maxWidth / longestLineWidth)));
      }
    }

    const fontRatio = fontSize / baseFontSize;

    this.metrics = {
      font: `${ fontSize }px ${ fontFamily }`,
      paddingX,
      lineHeight: Math.max(brDict['MIN_LINE_HEIGHT'], Math.round(this.engineConfig.lineHeight * fontRatio)),
      initialY: Math.max(brDict['MIN_INITIAL_Y'], Math.round(this.engineConfig.initialY * scale)),
    };

    this.lines.forEach(line => {
      line.segments.forEach(seg => {
        seg.totalWidth = undefined;
        seg.charWidths = undefined;
        seg.syllableWidths = undefined;
        if (seg.sprite && seg.progress < 1) {
          BREffectBase.disposeTextSprite(seg.sprite);
          seg.sprite = BREffectBase.createTextSprite(
              this.ctx,
              this.metrics.font,
              seg.text,
              this.engineConfig.activeTextColor,
          );
        }
      });
    });
  }

  public setRunning (running: boolean): void {
    if (running && !this.isRunning) {
      this.lastDrawTime = performance.now();
    }
    this.isRunning = running;
  }

  public appendChar (lineIndex: number, char: string): void {
    const line = this.lines[lineIndex];
    if (!line) {
      return;
    }

    this.activeLineIdx = lineIndex;
    line.rendered += char;
    line.isTyping = true;

    const lastSeg = line.segments[line.segments.length - 1];

    if (lastSeg && !lastSeg.tag) {
      lastSeg.text += char;
      lastSeg.totalWidth = undefined;
    } else {
      line.segments.push({ text: char, progress: 1, duration: 0 });
    }
  }

  public appendTag (lineIndex: number, tag: string, text: string, duration: number, param?: string): void {
    const line = this.lines[lineIndex];

    if (!line) {
      return;
    }

    this.activeLineIdx = lineIndex;
    line.rendered += text;
    line.isTyping = true;

    const segment = BREffects.createSegment(this.ctx, this.metrics.font, tag, text, duration, param, this.engineConfig.activeTextColor);
    line.segments.push(segment);
  }

  public completeLine (lineIndex: number): void {
    const line = this.lines[lineIndex];
    if (!line) {
      return;
    }

    line.isTyping = false;
    line.segments.forEach(seg => {
      if (seg.progress < 1) {
        seg.finishedAt = performance.now();
      }

      seg.progress = 1;
      BREffects.disposeSegment(seg);
    });
  }

  public finishScene (): void {
    this.isFinished = true;
    this.lines.forEach(line => {
      line.isTyping = false;
      line.segments.forEach(seg => {
        seg.progress = 1;
        BREffects.disposeSegment(seg);
      });
    });
  }

  public dispose (): void {
    this.lines.forEach(line => {
      line.segments.forEach(seg => BREffects.disposeSegment(seg));
      line.segments.length = 0;
    });
    BREffects.reset();
  }

  public snapScroll (): void {
    this.currentScrollY = this.getTargetScrollY();
  }
}
