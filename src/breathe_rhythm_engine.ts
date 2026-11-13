import { BREngineConfig, BRParserConfig, BRToken } from './types.ts';
import { BRParser, BR_PARSER_CONFIG } from './br_parser.ts';
import { BRRenderer } from './br_renderer.ts';
import { BRDelay } from './br_delay.ts';

export interface BRPoemPackage {
  meta: { title?: string; author: string };
  config?: {
    engine?: Partial<BREngineConfig>;
    parser?: Partial<BRParserConfig>;
  };
  lines: string[];
}

export type BRSceneCommand =
    | { type: 'char'; lineIndex: number; value: string; delay: number }
    | { type: 'tag'; lineIndex: number; tag: string; value: string; delay: number, param?: string }
    | { type: 'pause'; delay: number }
    | { type: 'effect'; name: string; delay: number }
    | { type: 'line-end'; lineIndex: number; delay: number }
    | { type: 'finish'; delay: number };


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

type EnginePhase = 'idle' | 'running' | 'paused' | 'finished';

export class BreatheRhythmEngine extends HTMLElement {
  private canvas!: HTMLCanvasElement;
  private renderer!: BRRenderer;
  private _abortController: AbortController | null = null;
  private scene: Generator<BRSceneCommand> | null = null;
  private pendingDelay: number = 0;
  private pendingCommandType: BRSceneCommand['type'] | null = null;
  private rafId: number | null = null;
  private boundResizeCanvas = this.resizeCanvas.bind(this);

  private tokens: BRToken[][] = [];
  private rawText: BRPoemPackage['lines'] = [];
  private poemMeta!: BRPoemPackage['meta'];
  private poemConfig: BRPoemPackage['config'] = {};
  private engineConfig: BREngineConfig = BR_ENGINE_CONFIG;
  private parserConfig: BRParserConfig = BR_PARSER_CONFIG;

  private _phase: EnginePhase = 'idle';

  constructor () {
    super();
  }

  private get phase (): EnginePhase {
    return this._phase;
  }

  private set phase (nextPhase: EnginePhase) {
    this._phase = nextPhase;
    this.renderer?.setRunning(nextPhase === 'running');
    this.dispatchEvent(new CustomEvent('engine-state-change', { bubbles: true }));
  }

  private get abortController (): AbortController | null {
    return this._abortController;
  }

  private set abortController (value: AbortController | null) {
    this._abortController = value;
  }

  private configure (
      engineConfig?: Partial<BREngineConfig>,
      parserConfig?: Partial<BRParserConfig>
  ): void {
    this.engineConfig = { ...BR_ENGINE_CONFIG, ...(engineConfig || {}) };
    this.parserConfig = { ...BR_PARSER_CONFIG, ...(parserConfig || {}) };
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

  private startRenderLoop (): void {
    if (this.rafId !== null) {
      return;
    }

    const tick = () => {
      this.rafId = null;

      if (!this.renderer) {
        return;
      }

      this.renderer.drawFrame();

      const needAnimation =
          this.isRunning ||
          this.renderer.hasParticles ||
          this.renderer.hasActiveFading ||
          this.renderer.hasActiveScroll;

      if (needAnimation) {
        this.rafId = requestAnimationFrame(tick);
      }
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private stopRenderLoop (): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private applyCanvasSize (): void {
    if (!this.canvas) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
  }

  private resizeCanvas (): void {
    this.applyCanvasSize();
    this.renderer?.updateResponsiveMetrics();
    this.renderer?.drawFrame();
  }

  private createCanvas (): void {
    this.canvas = document.createElement('canvas');

    Object.assign(this.style, {
      display: 'block',
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100dvh',
      overflow: 'hidden',
    });

    Object.assign(this.canvas.style, {
      display: 'block',
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100dvh',
      zIndex: '0',
    });

    this.appendChild(this.canvas);
  }

  private* sceneGenerator (): Generator<BRSceneCommand> {
    for (let l = 0; l < this.tokens.length; l++) {
      const lineTokens = this.tokens[l];

      for (let t = 0; t < lineTokens.length; t++) {
        const token = lineTokens[t];

        switch (token.type) {
          case 'pause':
            yield { type: 'pause', delay: token.delay };
            break;
          case 'effect':
            yield { type: 'effect', name: token.value, delay: token.delay };
            break;
          default:
            yield { type: 'char', lineIndex: l, value: token.value, delay: token.delay };
            break;
          case 'tag':
            yield {
              type: 'tag',
              lineIndex: l,
              tag: token.tag || 'wind',
              value: token.value,
              delay: token.delay,
              param: token.param,
            };
            break;
        }
      }

      const isLastLine = l === this.tokens.length - 1;
      const delayAfterLine = isLastLine ? this.engineConfig.finalDelay : this.engineConfig.lineEndDelay;
      yield { type: 'line-end', lineIndex: l, delay: delayAfterLine };
    }

    yield { type: 'finish', delay: 0 };
  }

  private async waitInterruption (
      ms: number,
      commandType: BRSceneCommand['type'],
      signal: AbortSignal
  ): Promise<boolean> {
    this.pendingCommandType = commandType;
    this.pendingDelay = ms;

    const { completed, remaining } = await BRDelay(ms, signal);

    if (!completed) {
      this.pendingDelay = remaining;
      return false;
    }

    this.pendingDelay = 0;
    this.pendingCommandType = null;
    return true;
  }

  private async updateScene (signal: AbortSignal): Promise<void> {
    if (!this.scene) {
      return;
    }

    if (this.pendingDelay > 0 && this.pendingCommandType) {
      const resumeDelay = this.pendingCommandType === 'line-end' || this.pendingCommandType === 'pause'
          ? Math.max(200, Math.round(this.pendingDelay * 0.5))
          : this.pendingDelay;

      const resumed = await this.waitInterruption(resumeDelay, this.pendingCommandType, signal);

      if (!resumed) {
        return;
      }
    }

    let next = this.scene.next();

    while (!next.done) {
      const cmd = next.value;

      switch (cmd.type) {
        case 'char':
          this.renderer.appendChar(cmd.lineIndex, cmd.value);
          break;
        case 'line-end':
          this.renderer.completeLine(cmd.lineIndex);
          break;
        case 'effect':
          this.renderer.renderEffect(cmd.name);
          break;
        case 'finish':
          this.renderer.finishScene();
          break;
        case 'tag':
          this.renderer.appendTag(cmd.lineIndex, cmd.tag, cmd.value, cmd.delay, cmd.param);
          break;
      }

      if (cmd.delay > 0) {
        const completed = await this.waitInterruption(cmd.delay, cmd.type, signal);
        if (!completed) {
          return;
        }
      }

      next = this.scene.next();
    }

    this.scene = null;
    this.pendingDelay = 0;
    this.pendingCommandType = null;
    this.phase = 'finished';
  }

  // ============================================================================
  // ПУБЛИЧНЫЙ API
  // ============================================================================

  public get isReady (): boolean {
    return this.rawText.length > 0;
  }

  public get isRunning (): boolean {
    return this.phase === 'running';
  }

  public get isFinished (): boolean {
    return this.phase === 'finished';
  }

  public get isPaused (): boolean {
    return this.phase === 'paused';
  }

  public pause (): void {
    if (!this.isRunning) {
      return;
    }

    this.abortController?.abort();
  }

  public async start (): Promise<void> {
    if (this.isRunning || !this.isReady) {
      return;
    }

    if (this.isFinished) {
      this.init();
    }

    const controller = new AbortController();
    this.abortController = controller;
    const { signal } = controller;

    this.phase = 'running';
    this.startRenderLoop();

    if (!this.scene) {
      this.scene = this.sceneGenerator();
    }

    try {
      await this.updateScene(signal);
    } catch (error) {
      this.phase = 'idle';
      console.error('[Ошибка] Исключение в цикле анимации:', error);
    } finally {
      if (signal.aborted && this.phase === 'running') {
        this.phase = 'paused';
      }

      if (this.abortController === controller) {
        this.abortController = null;
      }

      this.startRenderLoop();
    }
  }

  public init (): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.stopRenderLoop();
    this.scene = null;
    this.pendingDelay = 0;
    this.pendingCommandType = null;

    this.configure(this.poemConfig?.engine, this.poemConfig?.parser);

    this.tokens = this.rawText.map(line => BRParser.parse(line, this.parserConfig));
    this.renderer = new BRRenderer({
      canvas: this.canvas,
      lines: this.tokens.map(lineTokens => ({
        text: lineTokens.reduce((acc, t) => acc + (t.value ?? ''), ''),
        rendered: '',
        segments: [],
        isTyping: false,
        fadeFactor: 0,
      })),
      engineConfig: this.engineConfig,
      wordFinishedTest: BRParser.getWordFinishedTest(),
    });

    this.phase = 'idle';
    this.renderer.drawFrame();
  }

  public async connectedCallback (): Promise<void> {
    this.createCanvas();
    this.applyCanvasSize();
    window.addEventListener('resize', this.boundResizeCanvas);

    await this.loadData((response: BRPoemPackage[]) => {
      if (!this.isConnected) {
        return;
      }
      const pkg = response[0];
      this.rawText = pkg.lines;
      this.poemMeta = pkg.meta;
      this.poemConfig = pkg.config;

      this.init();
    });
  }

  public disconnectedCallback (): void {
    this.abortController?.abort();
    this.stopRenderLoop();
    window.removeEventListener('resize', this.boundResizeCanvas);
  }
}

customElements.define('breathe-rhythm', BreatheRhythmEngine);
