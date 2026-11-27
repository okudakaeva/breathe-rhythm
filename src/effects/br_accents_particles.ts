import { BRContext, BREngineConfig } from '../types.ts';
import { BRParticle } from './br_particle.ts';
import { BRAccentsBase, BRFlowParticle, BRRenderSegment, BRWindGustParticle } from './br_accents_base.ts';

export type BRParticleEffectMode = 'wind' | 'embers' | 'snow' | 'sparks' | 'dandelion';

const CONFIG = {
  DOT_BLUR: 14,
  MIN_ALPHA: 0.005,

  FLASH: {
    defaultCount: 60,
    defaultColor: '#ffffff',
    ySpread: 20,
  },

  WIND_SPAWN: {
    defaultWaves: 3,
    minTextWidth: 40,
    desktop: { density: 0.45, maxCount: 180, minCount: 65 },
    mobile: { density: 0.28, maxCount: 100, minCount: 40 },
    startXBase: -60,
    startXRange: 140,
    endXPad: 50,
    endXRange: 110,
    baseYOffsetRatio: 0.35,
    baseYSpreadRatio: 1.15,
    sizeMin: 0.35,
    sizeRange: 0.9,
    waveAmpMin: 3,
    waveAmpRange: 7,
    waveFreqMin: 1.5,
    waveFreqRange: 2,
    waveDelayStep: 0.14,
    delayJitter: 0.16,
    speedMin: 0.85,
    speedRange: 0.35,
    alphaMin: 0.35,
    alphaRange: 0.45,
  },

  FLOW_SPAWN: {
    yHeightRatio: 0.7,
    perChar: {
      mobile: { sparks: 2, embers: 2, default: 1 },
      desktop: { sparks: 4, embers: 3, default: 2 },
    },
    embers: {
      vxBias: 0.35,
      vxRange: 22,
      vyMin: 28,
      vyRange: 44,
      sizeMin: 0.7,
      sizeRange: 1.3,
      waveAmpMin: 3,
      waveAmpRange: 6,
      waveFreqMin: 1.5,
      waveFreqRange: 2,
      delaySpread: 0.6,
      delayJitter: 0.08,
      lifeWindow: 0.38,
      alphaMin: 0.65,
      alphaRange: 0.35,
    },
    snow: {
      xScatter: 18,
      yOffsetRatio: 1.4,
      yScatter: 24,
      vxBias: 0.4,
      vxRange: 16,
      vyMin: 34,
      vyRange: 32,
      sizeMin: 0.8,
      sizeRange: 1.5,
      waveAmpMin: 4,
      waveAmpRange: 7,
      waveFreqMin: 1.2,
      waveFreqRange: 1.4,
      delaySpread: 0.52,
      delayJitter: 0.12,
      lifeWindow: 0.44,
      alphaMin: 0.55,
      alphaRange: 0.35,
    },
    sparks: {
      speedMin: 26,
      speedRange: 42,
      xJitterRatio: 0.6,
      yCenterRatio: 0.35,
      yJitterRatio: 0.5,
      sizeMin: 0.6,
      sizeRange: 1.1,
      delaySpread: 0.65,
      delayJitter: 0.04,
      lifeWindow: 0.24,
      alphaMin: 0.85,
      alphaRange: 0.15,
    },
    dandelion: {
      vxMin: 36,
      vxRange: 58,
      vyMin: 14,
      vyRange: 34,
      sizeMin: 0.6,
      sizeRange: 1.3,
      waveAmpMin: 4,
      waveAmpRange: 8,
      waveFreqMin: 1.0,
      waveFreqRange: 1.5,
      delayStart: 0.38,
      delaySpread: 0.25,
      delayJitter: 0.08,
      lifeWindow: 0.42,
      alphaMin: 0.5,
      alphaRange: 0.4,
    },
  },

  WIND: {
    skewStrength: 0.28,
    driftDistance: 22,
    gustTravelWindow: 0.65,
    gustEasePower: 2.2,
    gustRadiusXRatio: 2.2,
    gustRadiusYRatio: 0.75,
    charStartSpread: 0.35,
    charStartOffset: 0.12,
    charRevealBase: 0.88,
    charRevealStartWeight: 0.5,
    charArcHeight: 3,
  },

  EMBERS: {
    textSpread: 0.6,
    textRevealDur: 0.25,
    flickerBase: 0.7,
    flickerAmp: 0.3,
    flickerFreq: 24,
    sizeShrink: 0.4,
  },

  SNOW: {
    textSpread: 0.55,
    textRevealDur: 0.32,
  },

  SPARKS: {
    textSpread: 0.65,
    textRevealDur: 0.18,
    lineWidth: 1.1,
    tailLag: 0.18,
  },

  DANDELION: {
    textSpread: 0.4,
    textRevealDur: 0.22,
  },
} as const;

export class BRAccentsParticle {

  // ============================================================================
  // ПУБЛИЧНЫЙ API
  // ============================================================================

  public static createFlashParticles (
      ctx: BRContext,
      centerX: number,
      centerY: number,
      spreadX: number,
      count: number = CONFIG.FLASH.defaultCount,
      color: string = CONFIG.FLASH.defaultColor
  ): BRParticle[] {
    const created: BRParticle[] = [];

    for (let i = 0; i < count; i++) {
      created.push(
          new BRParticle(
              centerX + (Math.random() - 0.5) * spreadX,
              centerY + (Math.random() - 0.5) * CONFIG.FLASH.ySpread,
              color,
              ctx
          )
      );
    }

    return created;
  }

  public static createWindGusts (
      ctx: BRContext,
      font: string,
      text: string,
      wavesCount: number = CONFIG.WIND_SPAWN.defaultWaves
  ): BRWindGustParticle[] {
    ctx.font = font;

    const cfg = CONFIG.WIND_SPAWN;
    const textWidth = Math.max(cfg.minTextWidth, Math.ceil(ctx.measureText(text).width));
    const fontSize = BRAccentsBase.extractFontSize(font);
    const gusts: BRWindGustParticle[] = [];
    const budget = BRAccentsBase.isMobileViewport() ? cfg.mobile : cfg.desktop;
    const count = Math.min(budget.maxCount, Math.max(budget.minCount, Math.round(textWidth * budget.density)));

    for (let i = 0; i < count; i++) {
      const waveIndex = i % Math.max(1, wavesCount);

      gusts.push({
        startX: cfg.startXBase - Math.random() * cfg.startXRange,
        endX: textWidth + cfg.endXPad + Math.random() * cfg.endXRange,
        baseY: -fontSize * cfg.baseYOffsetRatio + (Math.random() - 0.5) * (fontSize * cfg.baseYSpreadRatio),
        size: Math.random() * cfg.sizeRange + cfg.sizeMin,
        waveAmp: cfg.waveAmpMin + Math.random() * cfg.waveAmpRange,
        waveFreq: (cfg.waveFreqMin + Math.random() * cfg.waveFreqRange) * Math.PI,
        phase: Math.random() * Math.PI * 2,
        delayRatio: waveIndex * cfg.waveDelayStep + Math.random() * cfg.delayJitter,
        speedMulti: cfg.speedMin + Math.random() * cfg.speedRange,
        alphaMax: cfg.alphaMin + Math.random() * cfg.alphaRange,
      });
    }

    return gusts;
  }

  public static createFlowParticles (
      ctx: BRContext,
      font: string,
      segment: BRRenderSegment,
      mode: Exclude<BRParticleEffectMode, 'wind'>
  ): BRFlowParticle[] {
    ctx.font = font;

    const spawnCfg = CONFIG.FLOW_SPAWN;
    const chars = Array.from(segment.text);
    const totalChars = Math.max(1, chars.length);
    const fontSize = BRAccentsBase.extractFontSize(font);
    const list: BRFlowParticle[] = [];
    const perCharBudget = BRAccentsBase.isMobileViewport() ? spawnCfg.perChar.mobile : spawnCfg.perChar.desktop;
    let cursorX = 0;

    for (let c = 0; c < chars.length; c++) {
      const ch = chars[c];
      const chW = segment.charWidths?.[c] ?? ctx.measureText(ch).width;
      const charProgressRatio = totalChars > 1 ? c / totalChars : 0;

      if (ch.trim().length > 0) {
        const perChar = mode === 'sparks'
            ? perCharBudget.sparks
            : mode === 'embers'
                ? perCharBudget.embers
                : perCharBudget.default;

        for (let k = 0; k < perChar; k++) {
          const rx = cursorX + Math.random() * chW;
          const ry = -Math.random() * fontSize * spawnCfg.yHeightRatio;

          if (mode === 'embers') {
            const cfg = spawnCfg.embers;

            list.push({
              x: rx,
              y: ry,
              vx: (Math.random() - cfg.vxBias) * cfg.vxRange,
              vy: -(cfg.vyMin + Math.random() * cfg.vyRange),
              size: Math.random() * cfg.sizeRange + cfg.sizeMin,
              waveAmp: cfg.waveAmpMin + Math.random() * cfg.waveAmpRange,
              waveFreq: (cfg.waveFreqMin + Math.random() * cfg.waveFreqRange) * Math.PI,
              phase: Math.random() * Math.PI * 2,
              delayRatio: charProgressRatio * cfg.delaySpread + Math.random() * cfg.delayJitter,
              lifeWindow: cfg.lifeWindow,
              alphaMax: cfg.alphaMin + Math.random() * cfg.alphaRange,
            });
          } else if (mode === 'snow') {
            const cfg = spawnCfg.snow;

            list.push({
              x: rx + (Math.random() - 0.5) * cfg.xScatter,
              y: -fontSize * cfg.yOffsetRatio - Math.random() * cfg.yScatter,
              vx: (Math.random() - cfg.vxBias) * cfg.vxRange,
              vy: cfg.vyMin + Math.random() * cfg.vyRange,
              size: Math.random() * cfg.sizeRange + cfg.sizeMin,
              waveAmp: cfg.waveAmpMin + Math.random() * cfg.waveAmpRange,
              waveFreq: (cfg.waveFreqMin + Math.random() * cfg.waveFreqRange) * Math.PI,
              phase: Math.random() * Math.PI * 2,
              delayRatio: charProgressRatio * cfg.delaySpread + Math.random() * cfg.delayJitter,
              lifeWindow: cfg.lifeWindow,
              alphaMax: cfg.alphaMin + Math.random() * cfg.alphaRange,
            });
          } else if (mode === 'sparks') {
            const cfg = spawnCfg.sparks;
            const angle = Math.random() * Math.PI * 2;
            const speed = cfg.speedMin + Math.random() * cfg.speedRange;

            list.push({
              x: cursorX + chW * 0.5 + (Math.random() - 0.5) * chW * cfg.xJitterRatio,
              y: -fontSize * cfg.yCenterRatio + (Math.random() - 0.5) * fontSize * cfg.yJitterRatio,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: Math.random() * cfg.sizeRange + cfg.sizeMin,
              waveAmp: 0,
              waveFreq: 0,
              phase: 0,
              delayRatio: charProgressRatio * cfg.delaySpread + Math.random() * cfg.delayJitter,
              lifeWindow: cfg.lifeWindow,
              alphaMax: cfg.alphaMin + Math.random() * cfg.alphaRange,
            });
          } else {
            const cfg = spawnCfg.dandelion;

            list.push({
              x: rx,
              y: ry,
              vx: cfg.vxMin + Math.random() * cfg.vxRange,
              vy: -(cfg.vyMin + Math.random() * cfg.vyRange),
              size: Math.random() * cfg.sizeRange + cfg.sizeMin,
              waveAmp: cfg.waveAmpMin + Math.random() * cfg.waveAmpRange,
              waveFreq: (cfg.waveFreqMin + Math.random() * cfg.waveFreqRange) * Math.PI,
              phase: Math.random() * Math.PI * 2,

              delayRatio: cfg.delayStart + charProgressRatio * cfg.delaySpread + Math.random() * cfg.delayJitter,
              lifeWindow: cfg.lifeWindow,
              alphaMax: cfg.alphaMin + Math.random() * cfg.alphaRange,
            });
          }
        }
      }

      cursorX += chW;
    }

    return list;
  }

  public static drawWind (
      ctx: BRContext,
      config: BREngineConfig,
      _dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      skewStrength: number = CONFIG.WIND.skewStrength,
      driftDistance: number = CONFIG.WIND.driftDistance
  ): number {
    const cfg = CONFIG.WIND;
    const chars = Array.from(segment.text);
    const total = Math.max(1, chars.length);
    const textWidth = BRAccentsBase.getSegmentWidth(ctx, segment);

    if (segment.gusts && segment.gusts.length > 0) {
      ctx.save();
      ctx.fillStyle = config.activeTextColor;

      for (let i = 0; i < segment.gusts.length; i++) {
        const g = segment.gusts[i];
        const localT = ((segment.progress - g.delayRatio) * g.speedMulti) / cfg.gustTravelWindow;

        if (localT <= 0 || localT >= 1) {
          continue;
        }

        const ease = 1 - Math.pow(1 - localT, cfg.gustEasePower);
        const curX = startX + g.startX + (g.endX - g.startX) * ease;
        const curY = y + g.baseY + Math.sin(localT * g.waveFreq + g.phase) * g.waveAmp;

        ctx.globalAlpha = baseOpacity * g.alphaMax * Math.sin(localT * Math.PI);
        ctx.beginPath();
        ctx.ellipse(curX, curY, g.size * cfg.gustRadiusXRatio, g.size * cfg.gustRadiusYRatio, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    let cursorX = startX;

    for (let idx = 0; idx < chars.length; idx++) {
      const ch = chars[idx];
      const charWidth = segment.charWidths?.[idx] ?? ctx.measureText(ch).width;
      const startThreshold = (idx / total) * cfg.charStartSpread + cfg.charStartOffset;
      const t = BRAccentsBase.clamp01(
          (segment.progress - startThreshold) / (cfg.charRevealBase - startThreshold * cfg.charRevealStartWeight)
      );
      const ease = BRAccentsBase.easeOutCubic(t);

      if (ease > CONFIG.MIN_ALPHA) {
        const offsetX = (1 - ease) * -driftDistance;
        const offsetY = Math.sin((1 - ease) * Math.PI) * -cfg.charArcHeight * (1 - ease);
        const skew = (1 - ease) * skewStrength;

        ctx.save();
        ctx.translate(cursorX + offsetX, y + offsetY);
        ctx.transform(1, 0, skew, 1, 0, 0);
        BRAccentsBase.drawStyledText(ctx, ch, {
          x: 0,
          y: 0,
          rgbVal,
          alpha: baseOpacity * ease,
        });
        ctx.restore();
      }

      cursorX += charWidth;
    }

    return textWidth;
  }

  public static drawEmbers (
      ctx: BRContext,
      config: BREngineConfig,
      _dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number
  ): number {
    const cfg = CONFIG.EMBERS;
    const textWidth = BRAccentsBase.getSegmentWidth(ctx, segment);
    const p = BRAccentsBase.clamp01(segment.progress);
    const particles = segment.flowParticles;

    BRAccentsBase.drawCharReveal(ctx, segment, startX, y, rgbVal, baseOpacity, p, {
      spreadRatio: cfg.textSpread,
      revealDur: cfg.textRevealDur,
    });

    if (particles && particles.length > 0) {
      const dot = BRAccentsBase.getGlowDot(config.activeTextColor, CONFIG.DOT_BLUR);

      ctx.save();

      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        const localT = (p - pt.delayRatio) / pt.lifeWindow;

        if (localT <= 0 || localT >= 1) {
          continue;
        }

        const ease = BRAccentsBase.easeOutQuad(localT);
        const swayX = Math.sin(localT * pt.waveFreq + pt.phase) * pt.waveAmp;
        const curX = startX + pt.x + pt.vx * ease + swayX;
        const curY = y + pt.y + pt.vy * ease;
        const flicker = cfg.flickerBase + cfg.flickerAmp * Math.sin(p * cfg.flickerFreq + pt.phase);
        const alpha = baseOpacity * pt.alphaMax * Math.sin(localT * Math.PI) * flicker;

        BRAccentsBase.drawGlowDot(ctx, dot, curX, curY, pt.size * (1 - localT * cfg.sizeShrink), alpha);
      }

      ctx.restore();
    }

    return textWidth;
  }

  public static drawSnow (
      ctx: BRContext,
      config: BREngineConfig,
      _dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number
  ): number {
    const cfg = CONFIG.SNOW;
    const textWidth = BRAccentsBase.getSegmentWidth(ctx, segment);
    const p = BRAccentsBase.clamp01(segment.progress);
    const particles = segment.flowParticles;

    BRAccentsBase.drawCharReveal(ctx, segment, startX, y, rgbVal, baseOpacity, p, {
      spreadRatio: cfg.textSpread,
      revealDur: cfg.textRevealDur,
    });

    if (particles && particles.length > 0) {
      const dot = BRAccentsBase.getGlowDot(config.activeTextColor, CONFIG.DOT_BLUR);

      ctx.save();

      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        const localT = (p - pt.delayRatio) / pt.lifeWindow;

        if (localT <= 0 || localT >= 1) {
          continue;
        }

        const swayX = Math.sin(localT * pt.waveFreq + pt.phase) * pt.waveAmp;
        const curX = startX + pt.x + pt.vx * localT + swayX;
        const curY = y + pt.y + pt.vy * localT;
        const alpha = baseOpacity * pt.alphaMax * Math.sin(localT * Math.PI);

        BRAccentsBase.drawGlowDot(ctx, dot, curX, curY, pt.size, alpha);
      }

      ctx.restore();
    }

    return textWidth;
  }

  public static drawSparks (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number
  ): number {
    const cfg = CONFIG.SPARKS;
    const textWidth = BRAccentsBase.getSegmentWidth(ctx, segment);
    const p = BRAccentsBase.clamp01(segment.progress);
    const particles = segment.flowParticles;

    BRAccentsBase.drawCharReveal(ctx, segment, startX, y, rgbVal, baseOpacity, p, {
      spreadRatio: cfg.textSpread,
      revealDur: cfg.textRevealDur,
    });

    if (particles && particles.length > 0) {
      ctx.save();
      ctx.strokeStyle = config.activeTextColor;
      ctx.fillStyle = config.activeTextColor;
      ctx.lineWidth = cfg.lineWidth * dpr;

      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        const localT = (p - pt.delayRatio) / pt.lifeWindow;

        if (localT <= 0 || localT >= 1) {
          continue;
        }

        const ease = BRAccentsBase.easeOutCubic(localT);
        const tailEase = BRAccentsBase.easeOutCubic(Math.max(0, localT - cfg.tailLag));
        const curX = startX + pt.x + pt.vx * ease;
        const curY = y + pt.y + pt.vy * ease;
        const tailX = startX + pt.x + pt.vx * tailEase;
        const tailY = y + pt.y + pt.vy * tailEase;

        ctx.globalAlpha = baseOpacity * pt.alphaMax * (1 - localT);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(curX, curY);
        ctx.stroke();
      }

      ctx.restore();
    }

    return textWidth;
  }

  public static drawDandelion (
      ctx: BRContext,
      config: BREngineConfig,
      _dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number
  ): number {
    const cfg = CONFIG.DANDELION;
    const textWidth = BRAccentsBase.getSegmentWidth(ctx, segment);
    const p = BRAccentsBase.clamp01(segment.progress);
    const particles = segment.flowParticles;

    BRAccentsBase.drawCharReveal(ctx, segment, startX, y, rgbVal, baseOpacity, p, {
      spreadRatio: cfg.textSpread,
      revealDur: cfg.textRevealDur,
    });

    if (particles && particles.length > 0) {
      const dot = BRAccentsBase.getGlowDot(config.activeTextColor, CONFIG.DOT_BLUR);

      ctx.save();

      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        const localT = (p - pt.delayRatio) / pt.lifeWindow;

        if (localT <= 0 || localT >= 1) {
          continue;
        }

        const ease = BRAccentsBase.easeOutQuad(localT);
        const swayY = Math.sin(localT * pt.waveFreq + pt.phase) * pt.waveAmp;
        const curX = startX + pt.x + pt.vx * ease;
        const curY = y + pt.y + pt.vy * ease + swayY;
        const alpha = baseOpacity * pt.alphaMax * Math.sin(localT * Math.PI);

        BRAccentsBase.drawGlowDot(ctx, dot, curX, curY, pt.size, alpha);
      }

      ctx.restore();
    }

    return textWidth;
  }
}
