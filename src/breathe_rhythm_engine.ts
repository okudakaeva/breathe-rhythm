import { BRContext, BREngineConfig, BRParserConfig, BRPoemPackage, BRToken } from './types.ts';
import { Br_particle } from './br_particle.ts';
import { Br_parser, BR_PARSER_CONFIG } from './br_parser.ts';

const delay = (ms: number, signal?: AbortSignal) => {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException('Aborted', 'AbortError'));
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort);
  });
};

const BR_ENGINE_CONFIG: BREngineConfig = {
  bgColor: '#0b0b0b',
  textColor: 140,
  activeTextColor: '#ffffff',
  shadowColor: '#ffffff',
  finishedShadowColor: '#f0f0f0',
  font: '28px "Courier New", monospace',
  paddingX: 80,
  lineHeight: 60,
  initialY: 70,
  lineEndDelay: 800,
  finalDelay: 1000,
  maxShadowBlur: 25
};

export interface BREngineState {
  currentLineIdx: number;
  currentScrollY: number;
}

export class BreatheRhythmEngine extends HTMLElement {
  private canvas!: HTMLCanvasElement;
  private ctx!: BRContext;
  private _abortController: AbortController | null = null;
  private scene: Generator<BRToken | number> | null = null;
  private boundResizeCanvas = this.resizeCanvas.bind(this);

  public state: BREngineState = {
    currentLineIdx: 0,
    currentScrollY: 0,
  }

  private particles: Br_particle[] = [];
  private textLines: string[] = [];
  private lineFadeFactors: number[] = [];
  private parsedPoem: BRToken[][] = [];

  private poemRaw: BRPoemPackage['lines'] = [];
  private poemMeta: BRPoemPackage['meta'] = {};
  private poemConfig: BRPoemPackage['config'] = {};
  private engineConfig: BREngineConfig = BR_ENGINE_CONFIG;
  private parserConfig: BRParserConfig = BR_PARSER_CONFIG;

  constructor () {
    super();
  }

  private get abortController(): AbortController | null {
    return this._abortController;
  }

  private set abortController(value: AbortController | null) {
    this._abortController = value;
    this.updateState();
  }

  private configure (
      engineConfig?: Partial<BREngineConfig>,
      parserConfig?: Partial<BRParserConfig>
  ): void {
    if (engineConfig) {
      this.engineConfig = { ...this.engineConfig, ...engineConfig };
    }
    if (parserConfig) {
      this.parserConfig = { ...this.parserConfig, ...parserConfig };
    }
  }

  private async loadData (
      onLoad: (response: BRPoemPackage[]) => void = () => undefined
  ): Promise<BRPoemPackage[] | void> {
      const response = await fetch('./data.json');
      if (!response.ok) {
        throw new Error(`Ошибка загрузки: ${ response.statusText }`);
      }
      const data: BRPoemPackage[] = await response.json();
      onLoad(data);
      return data;
  }

  private resizeCanvas (): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.drawFrame();
  }

  private triggerFlash (): void {
    const { currentLineIdx, currentScrollY } = this.state;
    const x = this.canvas.width / 2;
    const y = this.engineConfig.initialY + (currentLineIdx * this.engineConfig.lineHeight) - currentScrollY + 15;

    for (let i = 0; i < 60; i++) {
      this.particles.push(
          new Br_particle(
              x + (Math.random() - 0.5) * 400,
              y + (Math.random() - 0.5) * 20,
              '#ffffff',
              this.ctx
          )
      );
    }
  }

  private* sceneGenerator (): Generator<BRToken | number> {
    for (let l = 0; l < this.parsedPoem.length; l++) {
      this.state.currentLineIdx = l;
      const tokens = this.parsedPoem[l];

      for (let t = 0; t < tokens.length; t++) {
        const token = tokens[t];

        switch (token.type) {
          case 'pause': {
            yield token.delay;
            break;
          }
          case 'effect': {
            yield token;
            break;
          }
          default: {
            this.textLines[l] += token.value;
            yield token.delay;
            break;
          }
        }
      }
      yield this.engineConfig.lineEndDelay;
    }

    this.state.currentLineIdx += 1; //+step before final
    yield this.engineConfig.finalDelay;
  }

  private renderLoop (signal: AbortSignal): void {
    if (signal.aborted) {
      return;
    }

    this.drawFrame();

    const hasActiveFading = this.lineFadeFactors.some((t, i) => {
      const { currentLineIdx } = this.state;

      return this.isFinished && t < 0.85 || i !== currentLineIdx && t > 0 && this.isRunning;
    });

    const needAnimation = this.isRunning || this.particles.length > 0 || hasActiveFading;

    if (needAnimation) {
      requestAnimationFrame(() => this.renderLoop(signal));
    }
  }

  private createCanvas (): void {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;

    this.style.display = 'block';
    this.style.position = 'absolute';
    this.style.top = '0';
    this.style.left = '0';
    this.style.width = '100%';
    this.style.height = '100dvh';
    this.style.overflow = 'hidden';

    this.canvas.style.display = 'block';
    this.canvas.style.position = 'absolute';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100dvh';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.zIndex = '0';

    this.appendChild(this.canvas);
  }

  private clearCanvas (): void {
    this.canvas.style.backgroundColor = this.engineConfig.bgColor;
    this.ctx.fillStyle = this.engineConfig.bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.font = this.engineConfig.font;
    this.ctx.textAlign = 'left';

    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = 'transparent';
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

  private updateScroll (): void {
    const { currentLineIdx, currentScrollY } = this.state;
    const scrollIndex = Math.min(currentLineIdx, this.poemRaw.length - 1);
    const visibleRowsCount = Math.ceil((this.canvas.height - this.engineConfig.initialY * 2) / this.engineConfig.lineHeight);
    const targetScrollY = Math.max(0, (scrollIndex - (visibleRowsCount - 1)) * this.engineConfig.lineHeight);

    this.state.currentScrollY += (targetScrollY - currentScrollY) * 0.05;
  }

  private getLineFadeFactor (index: number): number {
    const { currentLineIdx } = this.state;

    if (this.isFinished) {
      if (this.lineFadeFactors[index] < 0.85) {
        this.lineFadeFactors[index] = Math.min(0.85, this.lineFadeFactors[index] + 0.015);
      }
    } else if (index === currentLineIdx && this.isRunning) {
      this.lineFadeFactors[index] = 1.0;
    } else if (this.lineFadeFactors[index] > 0.0) {
      this.lineFadeFactors[index] = Math.max(0.0, this.lineFadeFactors[index] - 0.04);
    }

    return this.lineFadeFactors[index];
  }

  private getLineShadowBlur (fadeFactor: number): number {
    if (this.isFinished && fadeFactor < 0.4) {
      return Math.sin((fadeFactor / 0.4) * Math.PI) * this.engineConfig.maxShadowBlur;
    }
    return 0;
  }

  private compileWordFinishedRegExp (): RegExp {
    const stickySymbols = Br_parser.getSymbols();
    const escapedSymbols = stickySymbols.map(s => s === '.' ? `\\${s}` : s).join('');
    return new RegExp(`[${escapedSymbols}]$`);
  }

  private drawActiveWord (
      text: string,
      x: number,
      y: number,
      rgbVal: number,
      opacity: number
  ): void {
    const lastSpaceIdx = text.lastIndexOf(' ');
    let stableText = "";
    let activeWord = text;
    let stableWidth = 0;

    if (lastSpaceIdx !== -1) {
      stableText = text.substring(0, lastSpaceIdx + 1);
      activeWord = text.substring(lastSpaceIdx + 1);
    }
    const isWordFinished = this.compileWordFinishedRegExp().test(activeWord);

    if (isWordFinished) {
      this.drawStaticLine(text, x, y, rgbVal, opacity, 0);
      return;
    }

    if (stableText.length > 0) {
      stableWidth = this.ctx.measureText(stableText).width;
    }

    this.ctx.fillStyle = `rgba(${ rgbVal }, ${ rgbVal }, ${ rgbVal }, ${ opacity })`;
    this.ctx.shadowBlur = 0;
    if (stableText.length > 0) {
      this.ctx.fillText(stableText, x, y);
    }

    this.ctx.save();
    this.ctx.fillStyle = this.engineConfig.activeTextColor;
    this.ctx.shadowColor = this.engineConfig.shadowColor;
    this.ctx.shadowBlur = 20;
    this.ctx.fillText(activeWord, x + stableWidth, y);
    this.ctx.restore();
  }

  private drawStaticLine (
      text: string,
      x: number,
      y: number,
      rgbVal: number,
      opacity: number,
      shadowBlur: number
  ): void {
    this.ctx.fillStyle = `rgba(${ rgbVal }, ${ rgbVal }, ${ rgbVal }, ${ opacity })`;
    this.ctx.shadowColor = this.engineConfig.finishedShadowColor;
    this.ctx.shadowBlur = shadowBlur;
    this.ctx.fillText(text, x, y);
  }

  private drawFrame (): void {
    this.clearCanvas();
    this.drawParticles();
    this.updateScroll();

    for (let i = 0; i < this.poemRaw.length; i++) {
      if (this.textLines[i] === undefined) {
        continue;
      }

      const { currentScrollY, currentLineIdx } = this.state;
      const x = this.engineConfig.paddingX;
      let y = this.engineConfig.initialY + (i * this.engineConfig.lineHeight) - currentScrollY;

      if (y < 0 || y > this.canvas.height + 40) {
        continue;
      }

      const t = this.getLineFadeFactor(i);
      const shadowBlur = this.getLineShadowBlur(t);
      const rgbVal = Math.round(this.engineConfig.textColor + (255 - this.engineConfig.textColor) * t);
      const opacity = 0.3 + (0.7 * t);
      const currentText = this.textLines[i];
      const tokens = this.parsedPoem[i];
      const maxTextLength = tokens.reduce(
          (sum, token) => sum + (token.value ? token.value.length : 0),
          0
      );
      const isLinePrinting = currentText.length < maxTextLength;
      const isBreakLine = currentText.length === 0;
      const isCurrentActiveLine = i === currentLineIdx && !this.isFinished;

      if (isCurrentActiveLine && isLinePrinting && !isBreakLine) {
        this.drawActiveWord(currentText, x, y, rgbVal, opacity);
      } else {
        this.drawStaticLine(currentText, x, y, rgbVal, opacity, shadowBlur);
      }
    }
  }

  private updateState(fields: Partial<BREngineState> = {}): void {
    this.state = { ...this.state, ...fields };
    this.dispatchEvent(new CustomEvent('engine-state-change', { bubbles: true }));
  }

  public get isReady(): boolean {
    return this.poemRaw.length > 0;
  }

  public get isRunning(): boolean {
    return this.abortController !== null;
  }

  public get isFinished(): boolean {
    return this.parsedPoem.length > 0 && this.state.currentLineIdx >= this.parsedPoem.length && !this.isRunning;
  }

  public get isPaused(): boolean {
    return !this.isRunning && !this.isFinished && (this.state.currentLineIdx > 0 || this.textLines.some(l => l.length > 0));
  }

  public pause(): void {
    this.abortController?.abort();
  }

  public async start (): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    this.renderLoop(signal);

    if (!this.scene) {
      this.scene = this.sceneGenerator();
    }

    try {
      let next = this.scene.next();
      while (!next.done) {

        if (next.value) {
          if (typeof next.value === 'number') {
            await delay(next.value, signal);
          } else if (next.value.type && next.value.type === 'effect') {
            switch (next.value.value) {
              case 'flash': {
                this.triggerFlash();
                break;
              }
              default:
                break;
            }
          }
        }

        next = this.scene.next();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("[Ошибка] Исключение в цикле анимации:", error);
      }
    } finally {
      this.abortController = null;

      if (this.isFinished) {
        this.scene = null;
      }
    }
  }

  public init (): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.scene = null;

    this.configure(this.poemConfig?.engine || {}, this.poemConfig?.parser || {});

    this.particles = [];
    this.parsedPoem = this.poemRaw.map(line => Br_parser.parse(line, this.parserConfig));
    this.textLines = this.poemRaw.map(() => "");
    this.lineFadeFactors = this.poemRaw.map(() => 0);
    this.updateState({
      currentLineIdx: 0,
      currentScrollY: 0,
    });

    this.drawFrame();
  }

  public async connectedCallback (): Promise<void> {
    this.createCanvas();

    await this.loadData(async (response: BRPoemPackage[]) => {
      const pkg = response[0];
      this.poemRaw = pkg.lines;
      this.poemMeta = pkg.meta;
      this.poemConfig = pkg.config;

      this.init();
    });

    this.resizeCanvas();

    window.addEventListener('resize', this.boundResizeCanvas);
  }

  public disconnectedCallback (): void {
    if (this.abortController) {
      this.abortController.abort();
    }

    window.removeEventListener('resize', this.boundResizeCanvas);
  }
}

customElements.define('breathe-rhythm', BreatheRhythmEngine);
