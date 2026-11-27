import { BRContext, BREngineConfig } from '../types.ts';
import { BRAccentsBase, BRMaskParticle, BRRenderSegment } from './br_accents_base.ts';
import { brDict } from '../br_dictionary.ts';

export type BRTextMaskMode = 'sand' | 'fireflies' | 'glitter' | 'breeze' | 'frost' | 'constellation';

const CONFIG = {
  MASK_FILL_COLOR: '#ffffff',
  ALPHA_THRESHOLD: 110,
  PAD_X: 16,
  PAD_Y_RATIO: 0.7,
  HEIGHT_RATIO: 1.6,
  DOT_BLUR: 8,
  MIN_ALPHA: 0.005,
  MIN_OPACITY: 0.01,
  CONSTELLATION_LINK_DIST: 22,
  CONSTELLATION_LINE_WIDTH: 0.8,
  SAMPLE_STEP: { constellation: 6, fireflies: 3, default: 2 },

  FROST_SEEDS: {
    charsPerSeed: 4,
    minSeeds: 2,
    xMargin: 0.2,
    xJitter: 0.6,
    yBaseRatio: 0.15,
    yJitterRatio: 0.55,
    minSpread: 40,
  },

  SPAWN: {
    frost: {
      sizeMin: 0.7,
      sizeRange: 1.1,
      delaySpread: 0.55,
      delayJitter: 0.08,
      pulseMin: 10,
      pulseRange: 10,
    },
    constellation: {
      jitterRange: 6,
      sizeMin: 1.1,
      sizeRange: 1.3,
      delaySpread: 0.35,
      delayJitter: 0.1,
      pulseMin: 8,
      pulseRange: 8,
    },
    breeze: {
      windDistMin: 140,
      windDistRange: 160,
      yScatter: 42,
      sizeMin: 0.55,
      sizeRange: 1.15,
      zigzagFreqMin: 1.2,
      zigzagFreqRange: 1.6,
      zigzagAmpRange: 18,
      delaySpread: 0.48,
      delayJitter: 0.1,
    },
    glitter: {
      sizeMin: 0.7,
      sizeRange: 1.1,
      delaySpread: 0.65,
      pulseMin: 14,
      pulseRange: 18,
    },
    fireflies: {
      radiusMin: 14,
      radiusRange: 28,
      xBias: -10,
      sizeMin: 1.2,
      sizeRange: 1.6,
      zigzagFreqMin: 0.8,
      zigzagFreqRange: 1.2,
      zigzagAmpRange: 16,
      delaySpread: 0.6,
      delayJitter: 0.06,
      pulseMin: 6,
      pulseRange: 6,
    },
    sand: {
      xScatter: 48,
      xBias: 0.35,
      yScatter: 32,
      sizeMin: 0.8,
      sizeRange: 1.3,
      zigzagFreqMin: 1.5,
      zigzagFreqRange: 2,
      zigzagAmpRange: 14,
      delaySpread: 0.25,
      delayJitter: 0.1,
    },
  },

  FIREFLIES: {
    travelWindow: 0.36,
    settleWindow: 0.25,
    textSpread: 0.55,
    textStart: 0.22,
    textRevealDur: 0.28,
    easePower: 4,
    fadeInSpeed: 3.5,
    pulseBase: 0.75,
    pulseAmp: 0.25,
    blurBase: 10,
    blurPulseBoost: 8,
    sizeStart: 1.1,
    sizeShrink: 0.2,
  },
  SAND: {
    revealStart: 0.45,
    fadeOutStart: 0.65,
    travelBase: 0.75,
    travelDelayWeight: 0.5,
    fadeInSpeed: 3,
    maxAlpha: 0.9,
    blur: 6,
    sizeShrink: 0.25,
  },
  SHIMMER: {
    settleStart: 0.75,
    settleDur: 0.25,
    textSpread: 0.65,
    textRevealDur: 0.25,
    baseTextAlpha: 0.72,
    settleTextBoost: 0.28,
    fadeOutStart: 0.78,
    sparkleThreshold: 0.2,
    sparklePower: 2.2,
    blurBase: 6,
    blurBoost: 10,
    sizeBase: 0.8,
    sizeBoost: 0.6,
  },
  BREEZE: {
    textSpread: 0.45,
    textStart: 0.32,
    textRevealDur: 0.25,
    fadeOutStart: 0.72,
    travelWindow: 0.44,
    easePower: 3.4,
    fadeInSpeed: 4,
    maxAlpha: 0.9,
    blurBase: 3,
    blurMotionBoost: 6,
    sizeStart: 1.15,
    sizeShrink: 0.3,
  },
  FROST: {
    revealStart: 0.45,
    fadeOutStart: 0.72,
    growDur: 0.25,
    fadeInSpeed: 2.5,
    sparkBase: 0.65,
    sparkAmp: 0.35,
    blurBase: 4,
    blurFlashBoost: 12,
    sizeBase: 0.6,
    sizeGrowBoost: 0.4,
    sizeFlashBoost: 0.4,
  },
  CONSTELLATION: {
    revealStart: 0.55,
    fadeOutStart: 0.75,
    lineStart: 0.2,
    lineDur: 0.45,
    lineMaxAlpha: 0.55,
    starAppearDur: 0.22,
    twinkleBase: 0.7,
    twinkleAmp: 0.3,
    blurBase: 8,
    blurTwinkleBoost: 8,
    sizeBase: 0.85,
    sizeTwinkleBoost: 0.25,
  },
} as const;

export class BRAccentsMask {
  private static drawMaskParticles (
      ctx: BRContext,
      config: BREngineConfig,
      _dpr: number,
      grains: BRMaskParticle[],
      startX: number,
      y: number,
      baseOpacity: number,
      calcState: (g: BRMaskParticle) => { localT: number; alpha: number; blur: number; size: number; ease: number } | null
  ): void {
    const dot = BRAccentsBase.getGlowDot(config.activeTextColor, CONFIG.DOT_BLUR);

    ctx.save();

    for (let i = 0; i < grains.length; i++) {
      const g = grains[i];
      const state = calcState(g);

      if (!state || state.alpha <= CONFIG.MIN_ALPHA) {
        continue;
      }

      const dx = g.targetX - g.startX;
      const dy = g.targetY - g.startY;
      const dist = Math.hypot(dx, dy) || 1;
      const wave = Math.sin(state.localT * g.zigzagFreq + g.phase) * g.zigzagAmp * (1 - state.ease);

      const curX = startX + g.startX + dx * state.ease + (-dy / dist) * wave;
      const curY = y + g.startY + dy * state.ease + (dx / dist) * wave;

      BRAccentsBase.drawGlowDot(ctx, dot, curX, curY, state.size, baseOpacity * state.alpha);
    }

    ctx.restore();
  }

  private static createParticleForMode (
      mode: BRTextMaskMode,
      targetX: number,
      targetY: number,
      xNorm: number,
      textWidth: number,
      frostSeeds: Array<{ x: number; y: number }>
  ): BRMaskParticle {
    switch (mode) {
      case 'frost': {
        const cfg = CONFIG.SPAWN.frost;
        let minDist = Infinity;

        for (let s = 0; s < frostSeeds.length; s++) {
          const d = Math.hypot(targetX - frostSeeds[s].x, targetY - frostSeeds[s].y);
          if (d < minDist) {
            minDist = d;
          }
        }

        const maxSpread = Math.max(CONFIG.FROST_SEEDS.minSpread, textWidth / Math.max(1, frostSeeds.length));
        const distRatio = BRAccentsBase.clamp01(minDist / maxSpread);

        return {
          targetX,
          targetY,
          startX: targetX,
          startY: targetY,
          size: Math.random() * cfg.sizeRange + cfg.sizeMin,
          zigzagFreq: 0,
          zigzagAmp: 0,
          phase: Math.random() * Math.PI * 2,
          delayRatio: distRatio * cfg.delaySpread + Math.random() * cfg.delayJitter,
          pulseSpeed: cfg.pulseMin + Math.random() * cfg.pulseRange,
        };
      }
      case 'constellation': {
        const cfg = CONFIG.SPAWN.constellation;

        return {
          targetX,
          targetY,
          startX: targetX + (Math.random() - 0.5) * cfg.jitterRange,
          startY: targetY + (Math.random() - 0.5) * cfg.jitterRange,
          size: Math.random() * cfg.sizeRange + cfg.sizeMin,
          zigzagFreq: 0,
          zigzagAmp: 0,
          phase: Math.random() * Math.PI * 2,
          delayRatio: xNorm * cfg.delaySpread + Math.random() * cfg.delayJitter,
          pulseSpeed: cfg.pulseMin + Math.random() * cfg.pulseRange,
        };
      }
      case 'breeze': {
        const cfg = CONFIG.SPAWN.breeze;
        const windDist = cfg.windDistMin + Math.random() * cfg.windDistRange;

        return {
          targetX,
          targetY,
          startX: targetX - windDist,
          startY: targetY + (Math.random() - 0.5) * cfg.yScatter,
          size: Math.random() * cfg.sizeRange + cfg.sizeMin,
          zigzagFreq: (cfg.zigzagFreqMin + Math.random() * cfg.zigzagFreqRange) * Math.PI,
          zigzagAmp: (Math.random() - 0.5) * cfg.zigzagAmpRange,
          phase: Math.random() * Math.PI * 2,
          delayRatio: xNorm * cfg.delaySpread + Math.random() * cfg.delayJitter,
          pulseSpeed: 0,
        };
      }
      case 'glitter': {
        const cfg = CONFIG.SPAWN.glitter;

        return {
          targetX,
          targetY,
          startX: targetX,
          startY: targetY,
          size: Math.random() * cfg.sizeRange + cfg.sizeMin,
          zigzagFreq: 0,
          zigzagAmp: 0,
          phase: Math.random() * Math.PI * 2,
          delayRatio: xNorm * cfg.delaySpread,
          pulseSpeed: cfg.pulseMin + Math.random() * cfg.pulseRange,
        };
      }
      case 'fireflies': {
        const cfg = CONFIG.SPAWN.fireflies;
        const angle = Math.random() * Math.PI * 2;
        const radius = cfg.radiusMin + Math.random() * cfg.radiusRange;

        return {
          targetX,
          targetY,
          startX: targetX + Math.cos(angle) * radius + cfg.xBias,
          startY: targetY + Math.sin(angle) * radius,
          size: Math.random() * cfg.sizeRange + cfg.sizeMin,
          zigzagFreq: (Math.random() * cfg.zigzagFreqRange + cfg.zigzagFreqMin) * Math.PI,
          zigzagAmp: (Math.random() - 0.5) * cfg.zigzagAmpRange,
          phase: Math.random() * Math.PI * 2,
          delayRatio: xNorm * cfg.delaySpread + Math.random() * cfg.delayJitter,
          pulseSpeed: cfg.pulseMin + Math.random() * cfg.pulseRange,
        };
      }
      case 'sand':
      default: {
        const cfg = CONFIG.SPAWN.sand;

        return {
          targetX,
          targetY,
          startX: targetX + (Math.random() - cfg.xBias) * cfg.xScatter,
          startY: targetY + (Math.random() - 0.5) * cfg.yScatter,
          size: Math.random() * cfg.sizeRange + cfg.sizeMin,
          zigzagFreq: (Math.random() * cfg.zigzagFreqRange + cfg.zigzagFreqMin) * Math.PI,
          zigzagAmp: (Math.random() - 0.5) * cfg.zigzagAmpRange,
          phase: Math.random() * Math.PI * 2,
          delayRatio: xNorm * cfg.delaySpread + Math.random() * cfg.delayJitter,
          pulseSpeed: 0,
        };
      }
    }
  }

  // ============================================================================
  // ПУБЛИЧНЫЙ API
  // ============================================================================

  public static buildConstellationLinks (
      grains: BRMaskParticle[],
      maxLinkDist: number = CONFIG.CONSTELLATION_LINK_DIST
  ): Array<[number, number]> {
    const links: Array<[number, number]> = [];
    const maxDistSq = maxLinkDist * maxLinkDist;

    for (let i = 0; i < grains.length; i++) {
      const a = grains[i];

      for (let j = i + 1; j < grains.length; j++) {

        const b = grains[j];
        const dx = a.targetX - b.targetX;

        if (Math.abs(dx) > maxLinkDist) {
          continue;
        }

        const dy = a.targetY - b.targetY;

        if (dx * dx + dy * dy <= maxDistSq) {
          links.push([i, j]);
        }
      }
    }

    return links;
  }

  public static sampleTextMask (
      ctx: BRContext,
      font: string,
      text: string,
      mode: BRTextMaskMode = 'sand',
      alphaThreshold: number = CONFIG.ALPHA_THRESHOLD
  ): BRMaskParticle[] {
    ctx.font = font;

    const textWidth = Math.ceil(ctx.measureText(text).width);
    const fontSize = BRAccentsBase.extractFontSize(font);
    const padY = Math.ceil(fontSize * CONFIG.PAD_Y_RATIO);
    const maskW = Math.max(brDict['SPRITE_MIN_SIZE'], textWidth + CONFIG.PAD_X * 2);
    const maskH = Math.max(brDict['SPRITE_MIN_SIZE'], Math.ceil(fontSize * CONFIG.HEIGHT_RATIO) + padY * 2);
    const baselineY = padY + fontSize;
    const offscreen = document.createElement('canvas');
    const octx = offscreen.getContext(brDict['CONTEXT']);

    offscreen.width = maskW;
    offscreen.height = maskH;

    if (!octx) {
      return [];
    }

    octx.font = font;
    octx.textAlign = 'left';
    octx.textBaseline = 'alphabetic';
    octx.fillStyle = CONFIG.MASK_FILL_COLOR;
    octx.fillText(text, CONFIG.PAD_X, baselineY);

    const imgData = octx.getImageData(0, 0, maskW, maskH).data;
    const grains: BRMaskParticle[] = [];
    const baseStep = mode === 'constellation'
        ? CONFIG.SAMPLE_STEP.constellation
        : mode === 'fireflies'
            ? CONFIG.SAMPLE_STEP.fireflies
            : CONFIG.SAMPLE_STEP.default;
    const step = BRAccentsBase.isMobileViewport() ? baseStep + 1 : baseStep;
    const seedCfg = CONFIG.FROST_SEEDS;
    const frostSeedsCount = Math.max(seedCfg.minSeeds, Math.ceil(text.length / seedCfg.charsPerSeed));
    const frostSeeds: Array<{ x: number; y: number }> = [];

    if (mode === 'frost') {
      for (let s = 0; s < frostSeedsCount; s++) {
        frostSeeds.push({
          x: ((s + seedCfg.xMargin + Math.random() * seedCfg.xJitter) / frostSeedsCount) * Math.max(1, textWidth),
          y: -fontSize * (seedCfg.yBaseRatio + Math.random() * seedCfg.yJitterRatio),
        });
      }
    }

    for (let py = 0; py < maskH; py += step) {
      for (let px = 0; px < maskW; px += step) {
        if (imgData[(py * maskW + px) * 4 + 3] <= alphaThreshold) {
          continue;
        }

        const targetX = px - CONFIG.PAD_X;
        const targetY = py - baselineY;
        const xNorm = BRAccentsBase.clamp01(targetX / Math.max(1, textWidth));

        grains.push(this.createParticleForMode(mode, targetX, targetY, xNorm, textWidth, frostSeeds));
      }
    }

    return grains;
  }

  public static drawFireflies (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      travelWindow: number = CONFIG.FIREFLIES.travelWindow
  ): number {
    const cfg = CONFIG.FIREFLIES;

    return BRAccentsBase.drawMaskOrFallback(ctx, segment, startX, y, rgbVal, baseOpacity, (grains) => {
      BRAccentsBase.drawCharReveal(ctx, segment, startX, y, rgbVal, baseOpacity, segment.progress, {
        spreadRatio: cfg.textSpread,
        startOffset: cfg.textStart,
        revealDur: cfg.textRevealDur,
      });

      this.drawMaskParticles(ctx, config, dpr, grains, startX, y, baseOpacity, (g) => {
        const localT = BRAccentsBase.clamp01((segment.progress - g.delayRatio) / travelWindow);

        if (localT <= 0) {
          return null;
        }

        const overtime = Math.max(0, (segment.progress - (g.delayRatio + travelWindow)) / cfg.settleWindow);

        if (overtime >= 1) {
          return null;
        }

        const ease = 1 - Math.pow(1 - localT, cfg.easePower);
        const pulse = cfg.pulseBase + cfg.pulseAmp * Math.sin(segment.progress * g.pulseSpeed + g.phase);

        return {
          localT,
          ease,
          alpha: Math.min(1, localT * cfg.fadeInSpeed) * (1 - overtime) * pulse,
          blur: cfg.blurBase + cfg.blurPulseBoost * pulse,
          size: g.size * (cfg.sizeStart - ease * cfg.sizeShrink),
        };
      });
    });
  }

  public static drawSand (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      revealStart: number = CONFIG.SAND.revealStart
  ): number {
    const cfg = CONFIG.SAND;

    return BRAccentsBase.drawMaskOrFallback(ctx, segment, startX, y, rgbVal, baseOpacity, (grains) => {
      BRAccentsBase.drawTextReveal(
          ctx,
          segment.text,
          startX,
          y,
          rgbVal,
          baseOpacity,
          segment.progress,
          revealStart,
          false,
      );

      const fadeOut = BRAccentsBase.fadeOutWindow(segment.progress, cfg.fadeOutStart);

      if (fadeOut > CONFIG.MIN_OPACITY) {
        this.drawMaskParticles(ctx, config, dpr, grains, startX, y, baseOpacity, (g) => {
          const localT = BRAccentsBase.clamp01((segment.progress - g.delayRatio) / (cfg.travelBase - g.delayRatio * cfg.travelDelayWeight));
          if (localT <= 0) {
            return null;
          }

          const ease = BRAccentsBase.easeOutCubic(localT);

          return {
            localT,
            ease,
            alpha: Math.min(1, localT * cfg.fadeInSpeed) * fadeOut * cfg.maxAlpha,
            blur: cfg.blur,
            size: g.size * (1 - ease * cfg.sizeShrink),
          };
        });
      }
    });
  }

  public static drawShimmer (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number
  ): number {
    const cfg = CONFIG.SHIMMER;

    return BRAccentsBase.drawMaskOrFallback(ctx, segment, startX, y, rgbVal, baseOpacity, (grains) => {
      const p = BRAccentsBase.clamp01(segment.progress);
      const finalSettle = BRAccentsBase.easeOutCubic(BRAccentsBase.clamp01((p - cfg.settleStart) / cfg.settleDur));
      const fadeOut = BRAccentsBase.fadeOutWindow(p, cfg.fadeOutStart);

      BRAccentsBase.drawCharReveal(ctx, segment, startX, y, rgbVal, baseOpacity, p, {
        spreadRatio: cfg.textSpread,
        revealDur: cfg.textRevealDur,
        alphaMod: (ease) => ease * (cfg.baseTextAlpha + cfg.settleTextBoost * finalSettle),
      });

      if (fadeOut > CONFIG.MIN_OPACITY) {
        this.drawMaskParticles(ctx, config, dpr, grains, startX, y, baseOpacity, (g) => {

          if (p < g.delayRatio) {
            return null;
          }

          const rawWave = Math.sin(p * g.pulseSpeed + g.phase);

          if (rawWave <= cfg.sparkleThreshold) {
            return null;
          }

          const sparkle = Math.pow((rawWave - cfg.sparkleThreshold) / (1 - cfg.sparkleThreshold), cfg.sparklePower);

          return {
            localT: 1,
            ease: 1,
            alpha: sparkle * fadeOut,
            blur: cfg.blurBase + sparkle * cfg.blurBoost,
            size: g.size * (cfg.sizeBase + sparkle * cfg.sizeBoost),
          };
        });
      }
    });
  }

  public static drawBreeze (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number
  ): number {
    const cfg = CONFIG.BREEZE;

    return BRAccentsBase.drawMaskOrFallback(ctx, segment, startX, y, rgbVal, baseOpacity, (grains) => {
      const p = BRAccentsBase.clamp01(segment.progress);
      const fadeOut = BRAccentsBase.fadeOutWindow(p, cfg.fadeOutStart);

      BRAccentsBase.drawCharReveal(ctx, segment, startX, y, rgbVal, baseOpacity, p, {
        spreadRatio: cfg.textSpread,
        startOffset: cfg.textStart,
        revealDur: cfg.textRevealDur,
      });

      if (fadeOut > CONFIG.MIN_OPACITY) {
        this.drawMaskParticles(ctx, config, dpr, grains, startX, y, baseOpacity, (g) => {
          const localT = BRAccentsBase.clamp01((p - g.delayRatio) / cfg.travelWindow);

          if (localT <= 0) {
            return null;
          }

          const ease = 1 - Math.pow(1 - localT, cfg.easePower);
          const fadeIn = Math.min(1, localT * cfg.fadeInSpeed);

          return {
            localT,
            ease,
            alpha: fadeIn * fadeOut * cfg.maxAlpha,
            blur: (1 - ease) * cfg.blurMotionBoost + cfg.blurBase,
            size: g.size * (cfg.sizeStart - ease * cfg.sizeShrink),
          };
        });
      }
    });
  }

  public static drawFrost (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number
  ): number {
    const cfg = CONFIG.FROST;

    return BRAccentsBase.drawMaskOrFallback(ctx, segment, startX, y, rgbVal, baseOpacity, (grains) => {
      const p = BRAccentsBase.clamp01(segment.progress);
      const fadeOut = BRAccentsBase.fadeOutWindow(p, cfg.fadeOutStart);

      BRAccentsBase.drawTextReveal(ctx, segment.text, startX, y, rgbVal, baseOpacity, p, cfg.revealStart);

      if (fadeOut > CONFIG.MIN_OPACITY) {
        this.drawMaskParticles(ctx, config, dpr, grains, startX, y, baseOpacity, (g) => {
          const growT = BRAccentsBase.clamp01((p - g.delayRatio) / cfg.growDur);

          if (growT <= 0) {
            return null;
          }

          const flash = Math.sin(growT * Math.PI);
          const crystalSpark = cfg.sparkBase + cfg.sparkAmp * Math.sin(p * g.pulseSpeed + g.phase);

          return {
            localT: 1,
            ease: 1,
            alpha: Math.min(1, growT * cfg.fadeInSpeed) * fadeOut * crystalSpark,
            blur: cfg.blurBase + flash * cfg.blurFlashBoost,
            size: g.size * (cfg.sizeBase + cfg.sizeGrowBoost * BRAccentsBase.easeOutCubic(growT) + flash * cfg.sizeFlashBoost),
          };
        });
      }
    });
  }

  public static drawConstellation (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      maxLinkDist: number = CONFIG.CONSTELLATION_LINK_DIST
  ): number {
    const cfg = CONFIG.CONSTELLATION;

    return BRAccentsBase.drawMaskOrFallback(ctx, segment, startX, y, rgbVal, baseOpacity, (grains) => {
      const p = BRAccentsBase.clamp01(segment.progress);
      const fadeOut = BRAccentsBase.fadeOutWindow(p, cfg.fadeOutStart);

      BRAccentsBase.drawTextReveal(ctx, segment.text, startX, y, rgbVal, baseOpacity, p, cfg.revealStart);

      if (fadeOut > CONFIG.MIN_OPACITY) {
        const linePhase = BRAccentsBase.clamp01((p - cfg.lineStart) / cfg.lineDur);
        const links = segment.constellationLinks ?? BRAccentsMask.buildConstellationLinks(grains, maxLinkDist);

        if (linePhase > CONFIG.MIN_OPACITY && links.length > 0) {
          ctx.save();
          ctx.strokeStyle = config.activeTextColor;
          ctx.lineWidth = CONFIG.CONSTELLATION_LINE_WIDTH * dpr;
          ctx.globalAlpha = baseOpacity * linePhase * fadeOut * cfg.lineMaxAlpha;
          ctx.beginPath();
          for (let k = 0; k < links.length; k++) {
            const [i, j] = links[k];
            const a = grains[i];
            const b = grains[j];
            if (p < a.delayRatio || p < b.delayRatio) {
              continue;
            }
            ctx.moveTo(startX + a.targetX, y + a.targetY);
            ctx.lineTo(startX + b.targetX, y + b.targetY);
          }
          ctx.stroke();
          ctx.restore();
        }

        this.drawMaskParticles(ctx, config, dpr, grains, startX, y, baseOpacity, (g) => {
          const starAppear = BRAccentsBase.clamp01((p - g.delayRatio) / cfg.starAppearDur);

          if (starAppear <= 0) {
            return null;
          }

          const twinkle = cfg.twinkleBase + cfg.twinkleAmp * Math.sin(p * g.pulseSpeed + g.phase);
          const ease = BRAccentsBase.easeOutCubic(starAppear);

          return {
            localT: starAppear,
            ease,
            alpha: ease * fadeOut * twinkle,
            blur: cfg.blurBase + twinkle * cfg.blurTwinkleBoost,
            size: g.size * (cfg.sizeBase + twinkle * cfg.sizeTwinkleBoost),
          };
        });
      }
    });
  }
}
