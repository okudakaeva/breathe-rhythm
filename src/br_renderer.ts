import { BRContext, BREngineConfig } from './types.ts';
import { BRParticle } from './br_particle.ts';

export interface BRCtxMetrics {
  font: string;
  paddingX: number;
  lineHeight: number;
  initialY: number;
}

export interface RenderLine {
  text: string;
  rendered: string;
  isTyping: boolean;
  fadeFactor: number;
}

export class BRRenderer {
  private readonly ctx: BRContext;
  private readonly canvas: HTMLCanvasElement;
  private readonly engineConfig: BREngineConfig;
  private readonly wordFinishedTest: RegExp;

  private readonly lines: RenderLine[] = [];
  private particles: BRParticle[] = [];
  private metrics: BRCtxMetrics = { font: '', paddingX: 0, lineHeight: 0, initialY: 0 };

  private activeLineIdx: number = 0;
  private currentScrollY: number = 0;
  private isFinished: boolean = false;
  private isRunning: boolean = false;
  private dpr: number = 1;

  constructor (initializer: {
    canvas: HTMLCanvasElement;
    lines: RenderLine[];
    engineConfig: BREngineConfig;
    wordFinishedTest: RegExp;
  }) {
    this.canvas = initializer.canvas;
    this.ctx = this.canvas.getContext('2d')!;
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

  public reset (): void {
    this.particles = [];
    this.activeLineIdx = 0;
    this.currentScrollY = 0;
    this.isFinished = false;
    this.isRunning = false;
  }

  public setRunning (running: boolean): void {
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
  }

  public completeLine (lineIndex: number): void {
    const line = this.lines[lineIndex];
    if (!line) {
      return;
    }

    line.isTyping = false;
  }

  public finishScene (): void {
    this.isFinished = true;
    this.lines.forEach(line => {
      line.isTyping = false;
    });
  }

  public triggerFlash (): void {
    const x = this.logicalWidth / 2;
    const y = this.metrics.initialY + (this.activeLineIdx * this.metrics.lineHeight) - this.currentScrollY + 15;
    const spreadX = Math.min(400, this.logicalWidth - this.metrics.paddingX * 2);

    for (let i = 0; i < 60; i++) {
      this.particles.push(
          new BRParticle(
              x + (Math.random() - 0.5) * spreadX,
              y + (Math.random() - 0.5) * 20,
              '#ffffff',
              this.ctx
          )
      );
    }
  }

  public get hasActiveFading (): boolean {
    return this.lines.some((line, i) =>
        (this.isFinished && line.fadeFactor < 0.85) ||
        (!this.isFinished && i !== this.activeLineIdx && line.fadeFactor > 0)
    );
  }

  public get hasParticles (): boolean {
    return this.particles.length > 0;
  }

  public get hasActiveScroll (): boolean {
    return Math.abs(this.getTargetScrollY() - this.currentScrollY) > 0.1;
  }

  private getTargetScrollY (): number {
    const scrollIndex = Math.min(this.activeLineIdx, Math.max(0, this.lines.length - 1));
    const availableHeight = this.logicalHeight - this.metrics.initialY - this.metrics.lineHeight * 0.5;
    const visibleRowsCount = Math.max(1, Math.floor(availableHeight / this.metrics.lineHeight));
    return Math.max(0, (scrollIndex - (visibleRowsCount - 1)) * this.metrics.lineHeight);
  }

  private updateScroll (): void {
    const targetScrollY = this.getTargetScrollY();
    const diff = targetScrollY - this.currentScrollY;

    if (Math.abs(diff) <= 0.1) {
      this.currentScrollY = targetScrollY;
    } else {
      this.currentScrollY += diff * 0.035;
    }
  }

  private updateLineFadeFactor (line: RenderLine, index: number): number {
    const isLastLine = index === this.lines.length - 1;
    const isCurrentActive = index === this.activeLineIdx &&
        line.rendered.length > 0 &&
        (!isLastLine || line.isTyping || !this.isRunning);

    if (this.isFinished) {
      if (line.fadeFactor < 0.85) {
        line.fadeFactor = Math.min(0.85, line.fadeFactor + 0.015);
      }
    } else if (isCurrentActive) {
      line.fadeFactor = 1.0;
    } else if (line.fadeFactor > 0.0) {
      line.fadeFactor = Math.max(0.0, line.fadeFactor - 0.04);
    }

    return line.fadeFactor;
  }

  private getLineShadowBlur (fadeFactor: number): number {
    if (this.isFinished && fadeFactor < 0.4) {
      return Math.sin((fadeFactor / 0.4) * Math.PI) * this.engineConfig.maxShadowBlur;
    }
    return 0;
  }

  private drawParticles (): void {
    this.ctx.save();
    this.particles = this.particles.filter(p => {
      p.update();
      p.draw();
      return !p.isDead();
    });
    this.ctx.restore();
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
    this.ctx.shadowBlur = 20 * this.dpr;
    this.ctx.fillText(activeWord, x + stableWidth, y);
    this.ctx.restore();
  }

  private drawStaticLine (text: string, x: number, y: number, rgbVal: number, opacity: number, shadowBlur: number): void {
    this.ctx.fillStyle = `rgba(${ rgbVal }, ${ rgbVal }, ${ rgbVal }, ${ opacity })`;
    this.ctx.shadowColor = this.engineConfig.finishedShadowColor;
    this.ctx.shadowBlur = shadowBlur * this.dpr;
    this.ctx.fillText(text, x, y);
  }

  public drawFrame (): void {
    this.clearCanvas();
    this.drawParticles();
    this.updateScroll();

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const x = this.metrics.paddingX;
      const y = this.metrics.initialY + (i * this.metrics.lineHeight) - this.currentScrollY;

      if (y < -this.metrics.lineHeight || y > this.logicalHeight + 40) {
        continue;
      }

      const t = this.updateLineFadeFactor(line, i);
      const shadowBlur = this.getLineShadowBlur(t);
      const rgbVal = Math.round(this.engineConfig.textColor + (255 - this.engineConfig.textColor) * t);
      const opacity = 0.3 + (0.7 * t);

      if (line.isTyping && line.rendered.length > 0 && !this.isFinished) {
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

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.logicalWidth;
    const scale = Math.min(1, width / 768);

    const fontMatch = this.engineConfig.font.match(/^(\d+(?:\.\d+)?)px\s+(.+)$/);
    const baseFontSize = fontMatch ? parseFloat(fontMatch[1]) : 28;
    const fontFamily = fontMatch ? fontMatch[2] : '"Courier New", monospace';

    const paddingX = Math.max(20, Math.round(this.engineConfig.paddingX * scale));
    let fontSize = Math.max(14, Math.round(baseFontSize * scale));
    const maxWidth = Math.max(100, width - paddingX * 2);

    if (this.lines.length > 0) {
      this.ctx.font = `${ fontSize }px ${ fontFamily }`;
      const longestLineWidth = Math.max(
          0,
          ...this.lines.map(line => this.ctx.measureText(line.text).width)
      );

      if (longestLineWidth > maxWidth) {
        fontSize = Math.max(12, Math.floor(fontSize * (maxWidth / longestLineWidth)));
      }
    }

    const fontRatio = fontSize / baseFontSize;

    this.metrics = {
      font: `${ fontSize }px ${ fontFamily }`,
      paddingX,
      lineHeight: Math.max(24, Math.round(this.engineConfig.lineHeight * fontRatio)),
      initialY: Math.max(36, Math.round(this.engineConfig.initialY * scale)),
    };
  }
}
