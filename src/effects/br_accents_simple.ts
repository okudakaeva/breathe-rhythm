import { BRContext, BREngineConfig } from '../types.ts';
import { BRAccentsBase, BRRenderSegment, BRTextSprite } from './br_accents_base.ts';
import { BRTags } from '../br_tags.ts';

const CONFIG = {
  MIN_ALPHA: 0.005,
  MIN_OPACITY: 0.01,
  SLICE_BLEED: 4,
  PIVOT_Y_OFFSET: 8,

  SWEEP: {
    defaultFeather: 36,
    minClipWidth: 1,
  },

  ECHO: {
    pulses: [
      { start: 0.0, dur: 0.22, peakAlpha: 1.0, expand: 0.14 },
      { start: 0.36, dur: 0.24, peakAlpha: 0.65, expand: 0.24 },
      { start: 0.72, dur: 0.28, peakAlpha: 0.35, expand: 0.34 },
    ],
    spreadRatio: 0.52,
    tailCompress: 0.55,
    revealDur: 0.16,
    baseAlpha: 0.25,
    attackRatio: 0.2,
    decayPower: 2.0,
    ringsCount: 2,
    innerRingScaleMult: 0.5,
    innerRingAlpha: 0.95,
    outerRingAlpha: 0.6,
  },

  MIRROR: {
    spreadRatio: 0.65,
    tailCompress: 0.65,
    revealDur: 0.25,
    baseAlpha: 0.25,
    fadeOutStart: 0.7,
    rippleFreq: 4,
    rippleCharPhase: 0.45,
    rippleAmp: 1.5,
    rippleDamping: 0.4,
    offsetY: 20,
    scaleY: 0.72,
    reflectionAlpha: 0.34,
  },

  WATER: {
    maxTrails: 6,
    minTrails: 2,
    maxDriftX: 30,
    convergeStart: 0.55,
    convergeDur: 0.45,
    trailLagStep: 0.22,
    driftProgressDamping: 0.35,
    waveFreq: 3,
    waveTrailPhase: 1.3,
    waveBaseAmp: 1.5,
    waveRatioAmp: 3.5,
    trailBaseAlpha: 0.52,
    trailRatioFade: 0.32,
    trailConvergeFade: 0.85,
    mainRevealDur: 0.85,
    mainWaveFreq: 2,
    mainWaveAmp: 1.5,
    mainBaseAlpha: 0.35,
    glowSettleThreshold: 0.99,
    glowOverlayAlpha: 0.85,
  },

  GROW: {
    minScale: 0.45,
    overshoot: 0.08,
    spreadRatio: 0.68,
    tailCompress: 0.65,
  },
} as const;

export class BRAccentsSimple {
  private static drawSweepSprite (
      ctx: BRContext,
      dpr: number,
      sprite: BRTextSprite,
      fullTextWidth: number,
      startX: number,
      y: number,
      progress: number,
      offsetX: number,
      offsetY: number,
      alpha: number,
      useGlow: boolean,
      feather: number = CONFIG.SWEEP.defaultFeather
  ): void {
    if (progress <= 0 || alpha <= CONFIG.MIN_OPACITY) {
      return;
    }

    const easeSweep = BRAccentsBase.easeOutQuad(progress);
    const revealRight = startX - feather + (fullTextWidth + feather * 2) * easeSweep;
    const clipW = Math.max(0, Math.min(sprite.width, (revealRight - startX) + sprite.padX));

    if (clipW <= CONFIG.SWEEP.minClipWidth) {
      return;
    }

    const srcW = Math.round(clipW * dpr);
    const drawX = startX + offsetX - sprite.padX;
    const drawY = (y + offsetY) - sprite.baselineY;
    const source = useGlow ? sprite.glowCanvas : sprite.canvas;

    ctx.globalAlpha = alpha;
    ctx.drawImage(source, 0, 0, srcW, sprite.canvas.height, drawX, drawY, clipW, sprite.height);
  }

  private static forEachCharStep (
      ctx: BRContext,
      segment: BRRenderSegment,
      startX: number,
      progress: number,
      spreadRatio: number,
      tailCompress: number,
      onChar: (step: { index: number; ch: string; chW: number; cursorX: number; logicalOffset: number; localT: number }) => void
  ): number {
    const fullTextWidth = BRAccentsBase.getSegmentWidth(ctx, segment);
    const chars = Array.from(segment.text);
    const count = Math.max(1, chars.length);

    ctx.save();
    let cursorX = startX;
    let logicalOffset = 0;

    for (let i = 0; i < count; i++) {
      const ch = chars[i];
      const chW = segment.charWidths?.[i] ?? ctx.measureText(ch).width;
      const startThreshold = count > 1 ? (i / count) * spreadRatio : 0;
      const localT = BRAccentsBase.clamp01((progress - startThreshold) / (1 - startThreshold * tailCompress));

      if (localT > CONFIG.MIN_ALPHA) {
        onChar({ index: i, ch, chW, cursorX, logicalOffset, localT });
      }

      cursorX += chW;
      logicalOffset += chW;
    }

    ctx.restore();
    return fullTextWidth;
  }

  // ============================================================================
  // ПУБЛИЧНЫЙ API
  // ============================================================================

  public static drawEcho (
      ctx: BRContext,
      _config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      echoPulses: ReadonlyArray<{ start: number; dur: number; peakAlpha: number; expand: number }> = CONFIG.ECHO.pulses
  ): number {
    const cfg = CONFIG.ECHO;
    const sprite = segment.sprite;
    const p = BRAccentsBase.clamp01(segment.progress);

    if (!sprite) {
      return BRAccentsBase.fallbackText(ctx, segment.text, startX, y, rgbVal, baseOpacity * p);
    }

    return this.forEachCharStep(ctx, segment, startX, p, cfg.spreadRatio, cfg.tailCompress, ({ chW, cursorX, logicalOffset, localT }) => {
      const glyphStart = sprite.padX + logicalOffset;
      const sliceLeft = Math.max(0, glyphStart - CONFIG.SLICE_BLEED);
      const sliceRight = Math.min(sprite.width, glyphStart + chW + CONFIG.SLICE_BLEED);
      const sliceLogicalW = Math.max(1, sliceRight - sliceLeft);

      const srcX = Math.round(sliceLeft * dpr);
      const srcW = Math.round(sliceLogicalW * dpr);
      const drawBaseX = cursorX - (glyphStart - sliceLeft);
      const drawBaseY = y - sprite.baselineY;
      const mainReveal = BRAccentsBase.easeOutCubic(BRAccentsBase.clamp01(localT / cfg.revealDur));

      ctx.globalAlpha = baseOpacity * (cfg.baseAlpha + (1 - cfg.baseAlpha) * mainReveal);
      ctx.drawImage(sprite.canvas, srcX, 0, srcW, sprite.canvas.height, drawBaseX, drawBaseY, sliceLogicalW, sprite.height);

      for (let e = 0; e < echoPulses.length; e++) {
        const echo = echoPulses[e];
        const echoT = BRAccentsBase.clamp01((localT - echo.start) / echo.dur);
        if (echoT <= 0 || echoT >= 1) {
          continue;
        }

        const wave = echoT < cfg.attackRatio
            ? echoT / cfg.attackRatio
            : Math.pow(1 - (echoT - cfg.attackRatio) / (1 - cfg.attackRatio), cfg.decayPower);
        const expandProgress = BRAccentsBase.easeOutQuad(echoT);

        for (let ring = 0; ring < cfg.ringsCount; ring++) {
          const ringMult = ring === 0 ? cfg.innerRingScaleMult : 1.0;
          const scale = 1 + expandProgress * echo.expand * ringMult;
          const drawX = drawBaseX - (sliceLogicalW * (scale - 1)) * 0.5;
          const drawY = drawBaseY - (sprite.height * (scale - 1)) * 0.5;

          ctx.globalAlpha = baseOpacity * echo.peakAlpha * wave * (ring === 0 ? cfg.innerRingAlpha : cfg.outerRingAlpha);
          ctx.drawImage(sprite.glowCanvas, srcX, 0, srcW, sprite.canvas.height, drawX, drawY, sliceLogicalW * scale, sprite.height * scale);
        }
      }
    });
  }

  public static drawMirror (
      ctx: BRContext,
      _config: BREngineConfig,
      _dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number
  ): number {
    const cfg = CONFIG.MIRROR;
    const p = BRAccentsBase.clamp01(segment.progress);

    return this.forEachCharStep(ctx, segment, startX, p, cfg.spreadRatio, cfg.tailCompress, ({ index, ch, cursorX, localT }) => {
      const charReveal = BRAccentsBase.easeOutCubic(BRAccentsBase.clamp01(localT / cfg.revealDur));

      BRAccentsBase.drawStyledText(ctx, ch, {
        x: cursorX,
        y,
        rgbVal,
        alpha: baseOpacity * (cfg.baseAlpha + (1 - cfg.baseAlpha) * charReveal),
      });

      const reflectionLife = localT < cfg.fadeOutStart
          ? BRAccentsBase.easeOutCubic(localT / cfg.fadeOutStart)
          : 1 - BRAccentsBase.easeOutQuad((localT - cfg.fadeOutStart) / (1 - cfg.fadeOutStart));

      if (reflectionLife > CONFIG.MIN_OPACITY) {
        const rippleOffsetY = Math.sin(
            p * Math.PI * cfg.rippleFreq + index * cfg.rippleCharPhase
        ) * cfg.rippleAmp * (1 - localT * cfg.rippleDamping);
        const reflectionY = y + cfg.offsetY + rippleOffsetY;

        ctx.save();
        ctx.translate(0, reflectionY);
        ctx.scale(1, cfg.scaleY);

        BRAccentsBase.drawStyledText(ctx, ch, {
          x: cursorX,
          y: 0,
          rgbVal,
          alpha: baseOpacity * cfg.reflectionAlpha * reflectionLife,
        });

        ctx.restore();
      }
    });
  }

  public static drawWater (
      ctx: BRContext,
      _config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      maxTrails: number = CONFIG.WATER.maxTrails,
      maxDriftX: number = CONFIG.WATER.maxDriftX
  ): number {
    const cfg = CONFIG.WATER;
    const fullTextWidth = BRAccentsBase.getSegmentWidth(ctx, segment);
    const sprite = segment.sprite;
    const p = BRAccentsBase.clamp01(segment.progress);

    if (!sprite) {
      return BRAccentsBase.fallbackText(
          ctx,
          segment.text,
          startX,
          y,
          rgbVal,
          baseOpacity * p,
      );
    }

    ctx.save();

    const syllablesCount = segment.syllables?.length ?? BRTags.splitIntoSyllables(segment.text).length;
    const trailCount = Math.min(maxTrails, Math.max(cfg.minTrails, syllablesCount));
    const converge = BRAccentsBase.easeOutCubic(BRAccentsBase.clamp01((p - cfg.convergeStart) / cfg.convergeDur));
    const trailDamping = 1 - converge;

    for (let t = trailCount - 1; t >= 0; t--) {
      const ratio = (t + 1) / trailCount;
      const lag = ratio * cfg.trailLagStep;
      const trailP = BRAccentsBase.clamp01((p - lag) / (1 - lag));

      if (trailP <= 0) {
        continue;
      }

      const curOffsetX = (ratio * maxDriftX) * trailDamping * (1 - trailP * cfg.driftProgressDamping);
      const curOffsetY = Math.sin(
          p * Math.PI * cfg.waveFreq + t * cfg.waveTrailPhase) * (cfg.waveBaseAmp + ratio * cfg.waveRatioAmp
      ) * trailDamping;
      const curAlpha = baseOpacity * (cfg.trailBaseAlpha - ratio * cfg.trailRatioFade) * (1 - converge * cfg.trailConvergeFade);
      this.drawSweepSprite(
          ctx,
          dpr,
          sprite,
          fullTextWidth,
          startX,
          y,
          trailP,
          curOffsetX,
          curOffsetY,
          curAlpha,
          true,
          CONFIG.SWEEP.defaultFeather,
      );
    }
    const mainP = BRAccentsBase.clamp01(p / cfg.mainRevealDur);
    const mainEase = BRAccentsBase.easeOutCubic(mainP);
    const mainWaveY = Math.sin(p * Math.PI * cfg.mainWaveFreq) * cfg.mainWaveAmp * (1 - mainEase);

    this.drawSweepSprite(
        ctx,
        dpr,
        sprite,
        fullTextWidth,
        startX,
        y,
        mainP,
        0,
        mainWaveY,
        baseOpacity * (cfg.mainBaseAlpha + (1 - cfg.mainBaseAlpha) * mainEase),
        false,
        CONFIG.SWEEP.defaultFeather,
    );

    if (mainEase < cfg.glowSettleThreshold) {
      this.drawSweepSprite(
          ctx,
          dpr,
          sprite,
          fullTextWidth,
          startX,
          y,
          mainP,
          0,
          mainWaveY,
          baseOpacity * (1 - mainEase) * cfg.glowOverlayAlpha,
          true,
          CONFIG.SWEEP.defaultFeather,
      );
    }

    ctx.restore();

    return fullTextWidth;
  }

  public static drawGrow (
      ctx: BRContext,
      _config: BREngineConfig,
      _dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      minScale: number = CONFIG.GROW.minScale,
      overshoot: number = CONFIG.GROW.overshoot
  ): number {
    const cfg = CONFIG.GROW;
    const p = BRAccentsBase.clamp01(segment.progress);

    return this.forEachCharStep(ctx, segment, startX, p, cfg.spreadRatio, cfg.tailCompress, ({ ch, chW, cursorX, localT }) => {
      const ease = BRAccentsBase.easeOutCubic(localT);
      const bounce = Math.sin(localT * Math.PI) * overshoot;
      const scale = minScale + (1 - minScale) * ease + bounce;

      BRAccentsBase.drawStyledText(ctx, ch, {
        x: cursorX,
        y,
        rgbVal,
        alpha: baseOpacity * ease,
        scale,
        pivotX: cursorX + chW / 2,
        pivotY: y - CONFIG.PIVOT_Y_OFFSET,
      });
    });
  }
}
