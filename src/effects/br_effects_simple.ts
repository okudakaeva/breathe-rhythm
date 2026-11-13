import { BRContext, BREngineConfig } from '../types.ts';
import { BREffectBase, BRRenderSegment, BRTextSprite } from './br_effects_base.ts';
import { BRTags } from '../br_tags.ts';

export class BRSimpleEffects {
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
      feather: number = 36
  ): void {
    if (progress <= 0 || alpha <= 0.01) {
      return;
    }

    const easeSweep = BREffectBase.easeOutQuad(progress);
    const revealRight = startX - feather + (fullTextWidth + feather * 2) * easeSweep;
    const clipW = Math.max(0, Math.min(sprite.width, (revealRight - startX) + sprite.padX));
    if (clipW <= 1) {
      return;
    }

    const srcW = Math.round(clipW * dpr);
    const drawX = startX + offsetX - sprite.padX;
    const drawY = (y + offsetY) - sprite.baselineY;
    const source = useGlow ? sprite.glowCanvas : sprite.canvas;

    ctx.globalAlpha = alpha;
    ctx.drawImage(source, 0, 0, srcW, sprite.canvas.height, drawX, drawY, clipW, sprite.height);
  }

  // ============================================================================
  // ПУБЛИЧНЫЙ API
  // ============================================================================

  public static drawEcho (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      echoPulses: Array<{ start: number; dur: number; peakAlpha: number; expand: number }> = [
        { start: 0.0, dur: 0.22, peakAlpha: 1.0, expand: 0.14 },
        { start: 0.36, dur: 0.24, peakAlpha: 0.65, expand: 0.24 },
        { start: 0.72, dur: 0.28, peakAlpha: 0.35, expand: 0.34 },
      ]
  ): number {
    const fullTextWidth = BREffectBase.getSegmentWidth(ctx, segment);
    const sprite = segment.sprite;
    const p = BREffectBase.clamp01(segment.progress);
    if (!sprite) {
      return BREffectBase.fallbackText(ctx, segment.text, startX, y, rgbVal, baseOpacity * p);
    }

    const chars = Array.from(segment.text);
    const count = Math.max(1, chars.length);
    const bleed = 4;

    ctx.save();
    let cursorX = startX;
    let logicalOffset = 0;

    for (let i = 0; i < count; i++) {
      const ch = chars[i];
      const chW = segment.charWidths?.[i] ?? ctx.measureText(ch).width;
      const startThreshold = count > 1 ? (i / count) * 0.52 : 0;
      const localT = BREffectBase.clamp01((p - startThreshold) / (1 - startThreshold * 0.55));

      if (localT > 0.005) {
        const glyphStart = sprite.padX + logicalOffset;
        const sliceLeft = Math.max(0, glyphStart - bleed);
        const sliceRight = Math.min(sprite.width, glyphStart + chW + bleed);
        const sliceLogicalW = Math.max(1, sliceRight - sliceLeft);

        const srcX = Math.round(sliceLeft * dpr);
        const srcW = Math.round(sliceLogicalW * dpr);
        const drawBaseX = cursorX - (glyphStart - sliceLeft);
        const drawBaseY = y - sprite.baselineY;

        const mainReveal = BREffectBase.easeOutCubic(BREffectBase.clamp01(localT / 0.16));
        ctx.globalAlpha = baseOpacity * (0.25 + 0.75 * mainReveal);
        ctx.drawImage(sprite.canvas, srcX, 0, srcW, sprite.canvas.height, drawBaseX, drawBaseY, sliceLogicalW, sprite.height);

        for (let e = 0; e < echoPulses.length; e++) {
          const echo = echoPulses[e];
          const echoT = BREffectBase.clamp01((localT - echo.start) / echo.dur);
          if (echoT <= 0 || echoT >= 1) {
            continue;
          }

          const wave = echoT < 0.2 ? echoT / 0.2 : Math.pow(1 - (echoT - 0.2) / 0.8, 2.0);
          const expandProgress = BREffectBase.easeOutQuad(echoT);

          for (let ring = 0; ring < 2; ring++) {
            const ringMult = ring === 0 ? 0.5 : 1.0;
            const scale = 1 + expandProgress * echo.expand * ringMult;
            const drawX = drawBaseX - (sliceLogicalW * (scale - 1)) * 0.5;
            const drawY = drawBaseY - (sprite.height * (scale - 1)) * 0.5;

            ctx.globalAlpha = baseOpacity * echo.peakAlpha * wave * (ring === 0 ? 0.95 : 0.6);
            ctx.drawImage(sprite.glowCanvas, srcX, 0, srcW, sprite.canvas.height, drawX, drawY, sliceLogicalW * scale, sprite.height * scale);
          }
        }
      }

      cursorX += chW;
      logicalOffset += chW;
    }

    ctx.restore();
    return fullTextWidth;
  }

  public static drawMirror (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number
  ): number {
    const fullTextWidth = BREffectBase.getSegmentWidth(ctx, segment);
    const chars = Array.from(segment.text);
    const count = Math.max(1, chars.length);
    const p = BREffectBase.clamp01(segment.progress);

    ctx.save();
    let cursorX = startX;

    for (let i = 0; i < count; i++) {
      const ch = chars[i];
      const chW = segment.charWidths?.[i] ?? ctx.measureText(ch).width;
      const startThreshold = count > 1 ? (i / count) * 0.65 : 0;
      const localT = BREffectBase.clamp01((p - startThreshold) / (1 - startThreshold * 0.65));

      if (localT > 0.005) {
        const charReveal = BREffectBase.easeOutCubic(BREffectBase.clamp01(localT / 0.25));
        BREffectBase.drawStyledText(ctx, ch, {
          x: cursorX,
          y,
          rgbVal,
          alpha: baseOpacity * (0.25 + 0.75 * charReveal),
        });

        const reflectionLife = localT < 0.7
            ? BREffectBase.easeOutCubic(localT / 0.7)
            : 1 - BREffectBase.easeOutQuad((localT - 0.7) / 0.3);

        if (reflectionLife > 0.01) {
          const rippleOffsetY = Math.sin(p * Math.PI * 4 + i * 0.45) * 1.5 * (1 - localT * 0.4);
          const reflectionY = y + 20 + rippleOffsetY;

          ctx.save();
          ctx.translate(0, reflectionY);
          ctx.scale(1, 0.72);

          BREffectBase.drawStyledText(ctx, ch, {
            x: cursorX,
            y: 0,
            rgbVal,
            alpha: baseOpacity * 0.34 * reflectionLife,
          });

          ctx.restore();
        }
      }

      cursorX += chW;
    }

    ctx.restore();
    return fullTextWidth;
  }


  public static drawWater (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      maxTrails: number = 6,
      maxDriftX: number = 30
  ): number {
    const fullTextWidth = BREffectBase.getSegmentWidth(ctx, segment);
    const sprite = segment.sprite;
    const p = BREffectBase.clamp01(segment.progress);
    if (!sprite) {
      return BREffectBase.fallbackText(ctx, segment.text, startX, y, rgbVal, baseOpacity * p);
    }

    ctx.save();
    const syllablesCount = segment.syllables?.length ?? BRTags.splitIntoSyllables(segment.text).length;
    const trailCount = Math.min(maxTrails, Math.max(2, syllablesCount));
    const converge = BREffectBase.easeOutCubic(BREffectBase.clamp01((p - 0.55) / 0.45));
    const trailDamping = 1 - converge;

    for (let t = trailCount - 1; t >= 0; t--) {
      const ratio = (t + 1) / trailCount;
      const lag = ratio * 0.22;
      const trailP = BREffectBase.clamp01((p - lag) / (1 - lag));
      if (trailP <= 0) {
        continue;
      }

      const curOffsetX = (ratio * maxDriftX) * trailDamping * (1 - trailP * 0.35);
      const curOffsetY = Math.sin(p * Math.PI * 3 + t * 1.3) * (1.5 + ratio * 3.5) * trailDamping;
      const curAlpha = baseOpacity * (0.52 - ratio * 0.32) * (1 - converge * 0.85);
      this.drawSweepSprite(ctx, dpr, sprite, fullTextWidth, startX, y, trailP, curOffsetX, curOffsetY, curAlpha, true, 36);
    }

    const mainP = BREffectBase.clamp01(p / 0.85);
    const mainEase = BREffectBase.easeOutCubic(mainP);
    const mainWaveY = Math.sin(p * Math.PI * 2) * 1.5 * (1 - mainEase);
    this.drawSweepSprite(ctx, dpr, sprite, fullTextWidth, startX, y, mainP, 0, mainWaveY, baseOpacity * (0.35 + 0.65 * mainEase), false, 36);

    ctx.restore();
    return fullTextWidth;
  }

  public static drawGrow (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      minScale: number = 0.45,
      overshoot: number = 0.08
  ): number {
    const fullTextWidth = BREffectBase.getSegmentWidth(ctx, segment);
    const chars = Array.from(segment.text);
    const count = Math.max(1, chars.length);
    const p = BREffectBase.clamp01(segment.progress);

    ctx.save();
    let cursorX = startX;

    for (let i = 0; i < count; i++) {
      const ch = chars[i];
      const chW = segment.charWidths?.[i] ?? ctx.measureText(ch).width;
      const startThreshold = count > 1 ? (i / count) * 0.68 : 0;
      const localT = BREffectBase.clamp01((p - startThreshold) / (1 - startThreshold * 0.65));

      if (localT > 0.005) {
        const ease = BREffectBase.easeOutCubic(localT);
        const bounce = Math.sin(localT * Math.PI) * overshoot;
        const scale = minScale + (1 - minScale) * ease + bounce;

        BREffectBase.drawStyledText(ctx, ch, {
          x: cursorX,
          y,
          rgbVal,
          alpha: baseOpacity * ease,
          shadowColor: config.shadowColor,
          shadowBlur: (1 - ease) * 14 * dpr,
          scale,
          pivotX: cursorX + chW / 2,
          pivotY: y - 8,
        });
      }

      cursorX += chW;
    }

    ctx.restore();
    return fullTextWidth;
  }
}
