import { BRContext, BREngineConfig } from '../types.ts';
import { BRTags } from '../br_tags.ts';
import { BREffectBase, BRRenderSegment, BRTextSprite } from './br_effects_base.ts';

interface BRSyllableSliceContext {
  localT: number;
  srcX: number;
  srcW: number;
  sliceLogicalW: number;
  drawBaseX: number;
  drawBaseY: number;
}

export class BRSyllabicEffects {
  private static getSyllables (segment: BRRenderSegment): string[] {
    return segment.syllables?.length ? segment.syllables : BRTags.splitIntoSyllables(segment.text);
  }

  private static parseSyllableParam (param: string | undefined, totalSyllables: number): number | null {
    if (!param) {
      return null;
    }
    const parsed = parseInt(param, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return null;
    }
    return Math.min(totalSyllables, parsed) - 1;
  }

  private static drawSingleSyllable (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      text: string,
      textWidth: number,
      p: number,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      minScale: number,
      bounceAmp: number
  ): number {
    const ease = BREffectBase.easeOutCubic(p);
    const scale = minScale + (1 - minScale) * ease + Math.sin(p * Math.PI) * bounceAmp;

    BREffectBase.drawStyledText(ctx, text, {
      x: startX,
      y,
      rgbVal,
      alpha: baseOpacity * ease,
      shadowColor: config.shadowColor,
      shadowBlur: Math.sin(p * Math.PI) * 20 * dpr,
      scale,
      pivotX: startX + textWidth / 2,
      pivotY: y - 8,
    });

    return textWidth;
  }

  private static forEachSyllableSlice (
      ctx: BRContext,
      dpr: number,
      sprite: BRTextSprite,
      parts: string[],
      startX: number,
      y: number,
      progress: number,
      spreadRatio: number,
      tailCompress: number,
      onSlice: (slice: BRSyllableSliceContext) => void
  ): void {
    const count = parts.length;
    const bleed = 4;
    let cursorX = startX;
    let logicalOffset = 0;

    for (let i = 0; i < count; i++) {
      const partW = ctx.measureText(parts[i]).width;
      const startThreshold = count > 1 ? (i / count) * spreadRatio : 0;
      const localT = BREffectBase.clamp01((progress - startThreshold) / (1 - startThreshold * tailCompress));

      if (localT > 0.005) {
        const glyphStart = sprite.padX + logicalOffset;
        const sliceLeft = Math.max(0, glyphStart - bleed);
        const sliceRight = Math.min(sprite.width, glyphStart + partW + bleed);
        const sliceLogicalW = Math.max(1, sliceRight - sliceLeft);

        onSlice({
          localT,
          srcX: Math.round(sliceLeft * dpr),
          srcW: Math.round(sliceLogicalW * dpr),
          sliceLogicalW,
          drawBaseX: cursorX - (glyphStart - sliceLeft),
          drawBaseY: y - sprite.baselineY,
        });
      }

      cursorX += partW;
      logicalOffset += partW;
    }
  }

  // ============================================================================
  // ПУБЛИЧНЫЙ API
  // ============================================================================

  public static drawFire (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      flameWaves: number = 2,
      flameLiftY: number = 14
  ): number {
    const fullTextWidth = ctx.measureText(segment.text).width;
    const sprite = segment.sprite;
    const p = BREffectBase.clamp01(segment.progress);
    if (!sprite) {
      return BREffectBase.fallbackText(ctx, segment.text, startX, y, rgbVal, baseOpacity * p);
    }

    ctx.save();
    this.forEachSyllableSlice(ctx, dpr, sprite, this.getSyllables(segment), startX, y, p, 0.62, 0.75, (s) => {
      const mainReveal = BREffectBase.clamp01(s.localT / 0.45);
      const easeMain = BREffectBase.easeOutCubic(mainReveal);
      const flash = Math.sin(mainReveal * Math.PI);

      ctx.globalAlpha = baseOpacity * easeMain;
      ctx.drawImage(sprite.canvas, s.srcX, 0, s.srcW, sprite.canvas.height, s.drawBaseX, s.drawBaseY, s.sliceLogicalW, sprite.height);

      if (flash > 0.01) {
        ctx.globalAlpha = baseOpacity * flash * 0.75;
        ctx.drawImage(sprite.glowCanvas, s.srcX, 0, s.srcW, sprite.canvas.height, s.drawBaseX, s.drawBaseY, s.sliceLogicalW, sprite.height);
      }

      for (let w = 0; w < flameWaves; w++) {
        const waveDelay = w * 0.14;
        const waveT = BREffectBase.clamp01((s.localT - waveDelay) / (1 - waveDelay));
        if (waveT <= 0 || waveT >= 1) {
          continue;
        }

        const easeWave = 1 - Math.pow(1 - waveT, 2.2);
        const reachMult = 1 + w * 0.35;
        const scale = 1 + easeWave * 0.06 * reachMult;
        const waveAlpha = Math.pow(1 - waveT, 1.8) * (0.45 / (1 + w * 0.3));

        if (waveAlpha > 0.01) {
          const waveX = s.drawBaseX + easeWave * 10 * reachMult - (s.sliceLogicalW * (scale - 1)) * 0.2;
          const waveY = s.drawBaseY - easeWave * flameLiftY * reachMult - (sprite.height * (scale - 1)) * 0.5;
          ctx.globalAlpha = baseOpacity * waveAlpha;
          ctx.drawImage(sprite.glowCanvas, s.srcX, 0, s.srcW, sprite.canvas.height, waveX, waveY, s.sliceLogicalW * scale, sprite.height * scale);
        }
      }
    });
    ctx.restore();

    return fullTextWidth;
  }

  public static drawPulse (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      pauseWeight: number = 1.5,
      accentWeight: number = 1.4
  ): number {
    const textWidth = ctx.measureText(segment.text).width;
    const parts = this.getSyllables(segment);
    const count = parts.length;
    const p = BREffectBase.clamp01(segment.progress);
    if (count === 1) {
      return this.drawSingleSyllable(ctx, config, dpr, segment.text, textWidth, p, startX, y, rgbVal, baseOpacity, 0.85, 0.04);
    }

    const accentIdx = this.parseSyllableParam(segment.param, count) ?? (count - 1);
    const preCount = accentIdx;
    const postCount = count - 1 - accentIdx;
    const actualPauseWeight = preCount > 0 ? pauseWeight : 0;
    const postStepWeight = 0.85;
    const totalWeight = preCount + actualPauseWeight + accentWeight + postCount * postStepWeight;
    const preEnd = preCount / totalWeight;
    const pauseEnd = (preCount + actualPauseWeight) / totalWeight;
    const accentEnd = (preCount + actualPauseWeight + accentWeight) / totalWeight;
    let cursorX = startX;

    if (p < preEnd && preCount > 0) {
      const stepFloat = (p / preEnd) * preCount;
      const activeStep = Math.floor(stepFloat);
      const stepPhase = stepFloat - activeStep;

      for (let i = 0; i <= activeStep; i++) {
        const part = parts[i];
        const partW = ctx.measureText(part).width;
        if (i === activeStep) {
          const ease = BREffectBase.easeOutCubic(stepPhase);
          const pulse = Math.sin(stepPhase * Math.PI);
          BREffectBase.drawStyledText(ctx, part, {
            x: cursorX,
            y,
            rgbVal,
            alpha: baseOpacity * (0.2 + 0.65 * ease),
            shadowColor: config.shadowColor,
            shadowBlur: (10 + pulse * 14) * dpr,
            scale: 0.78 + 0.22 * ease + pulse * 0.06,
            pivotX: cursorX + partW / 2,
          });
        } else {
          BREffectBase.drawStyledText(ctx, part, { x: cursorX, y, rgbVal, alpha: baseOpacity * 0.45 });
        }
        cursorX += partW;
      }
    } else if (p < pauseEnd && actualPauseWeight > 0) {
      const pauseT = (p - preEnd) / (pauseEnd - preEnd);
      const preText = parts.slice(0, preCount).join('');
      const preW = ctx.measureText(preText).width;
      BREffectBase.drawStyledText(ctx, preText, {
        x: startX,
        y,
        rgbVal,
        alpha: baseOpacity * (0.45 - pauseT * 0.12),
        shadowColor: config.shadowColor,
        shadowBlur: 8 * dpr,
        scale: 1 - Math.sin(pauseT * Math.PI) * 0.025,
        pivotX: startX + preW / 2,
      });
    } else if (p < accentEnd) {
      const accentT = (p - pauseEnd) / (accentEnd - pauseEnd);
      const ease = BREffectBase.easeOutCubic(accentT);
      const flash = Math.sin(accentT * Math.PI);

      if (preCount > 0) {
        const preText = parts.slice(0, preCount).join('');
        const preW = ctx.measureText(preText).width;
        BREffectBase.drawStyledText(ctx, preText, {
          x: startX,
          y,
          rgbVal,
          alpha: baseOpacity * (0.35 + 0.65 * ease),
          shadowColor: config.shadowColor,
          shadowBlur: flash * 14 * dpr,
        });
        cursorX += preW;
      }

      const accentPart = parts[accentIdx];
      const accentW = ctx.measureText(accentPart).width;
      BREffectBase.drawStyledText(ctx, accentPart, {
        x: cursorX,
        y,
        rgbVal,
        alpha: baseOpacity * ease,
        shadowColor: config.shadowColor,
        shadowBlur: (12 + flash * 22) * dpr,
        scale: 0.72 + 0.28 * ease + flash * 0.1,
        pivotX: cursorX + accentW / 2,
      });
    } else {
      const beforePostText = parts.slice(0, accentIdx + 1).join('');
      BREffectBase.drawStyledText(ctx, beforePostText, {
        x: startX,
        y,
        rgbVal,
        alpha: baseOpacity,
      });
      cursorX += ctx.measureText(beforePostText).width;
      if (postCount > 0) {
        const postP = (p - accentEnd) / (1 - accentEnd);
        const stepFloat = postP * postCount;
        const activePostStep = Math.floor(stepFloat);
        const stepPhase = stepFloat - activePostStep;

        for (let k = 0; k <= activePostStep && k < postCount; k++) {
          const part = parts[accentIdx + 1 + k];
          const partW = ctx.measureText(part).width;
          const ease = k === activePostStep ? BREffectBase.easeOutCubic(stepPhase) : 1;
          BREffectBase.drawStyledText(ctx, part, {
            x: cursorX,
            y,
            rgbVal,
            alpha: baseOpacity * ease,
          });
          cursorX += partW;
        }
      }
    }
    return textWidth;
  }

  public static drawRipple (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      ringsCount: number = 3,
      waveWidth: number = 48
  ): number {
    const fullTextWidth = ctx.measureText(segment.text).width;
    const parts = this.getSyllables(segment);
    const sprite = segment.sprite;
    const p = BREffectBase.clamp01(segment.progress);
    const epicentreIdx = this.parseSyllableParam(segment.param, parts.length);

    let epicentreX = 0;
    if (epicentreIdx !== null) {
      let accW = 0;
      for (let i = 0; i < epicentreIdx; i++) {
        accW += ctx.measureText(parts[i]).width;
      }
      epicentreX = accW + ctx.measureText(parts[epicentreIdx]).width / 2;
    }

    const travelDistance = Math.max(fullTextWidth - epicentreX, 40) + 30;
    const waveRadius = p * travelDistance * 1.25;
    ctx.save();

    if (sprite) {
      for (let ring = 0; ring < ringsCount; ring++) {
        const ringDelay = ring * 0.14;
        const ringT = BREffectBase.clamp01((p - ringDelay) / (1 - ringDelay));

        if (ringT <= 0 || ringT >= 1) {
          continue;
        }

        const easeRing = BREffectBase.easeOutQuad(ringT);
        const scaleX = 1 + easeRing * 0.08 * (1 + ring * 0.3);
        const scaleY = 1 + easeRing * 0.22 * (1 + ring * 0.3);
        const ringAlpha = Math.pow(1 - ringT, 1.6) * (0.45 / (1 + ring * 0.25));
        if (ringAlpha > 0.01) {
          const pivotX = startX + epicentreX;
          const pivotY = y - 8;
          ctx.save();
          ctx.translate(pivotX, pivotY);
          ctx.scale(scaleX, scaleY);
          ctx.translate(-pivotX, -pivotY);
          ctx.globalAlpha = baseOpacity * ringAlpha;
          ctx.drawImage(sprite.glowCanvas, startX - sprite.padX, y - sprite.baselineY, sprite.width, sprite.height);
          ctx.restore();
        }
      }
    }

    const chars = Array.from(segment.text);
    const baseReveal = BREffectBase.easeOutCubic(BREffectBase.clamp01(p / 0.35));
    let cursorX = startX;

    for (let c = 0; c < chars.length; c++) {
      const ch = chars[c];
      const chW = ctx.measureText(ch).width;
      const charCenterRel = (cursorX - startX) + chW / 2;
      const distForward = charCenterRel - epicentreX;

      let crestFactor = 0;
      if (distForward >= -waveWidth * 0.3) {
        const crestDelta = Math.abs(distForward - waveRadius);
        if (crestDelta < waveWidth) {
          crestFactor = Math.cos((crestDelta / waveWidth) * (Math.PI / 2)) * (1 - p * 0.65);
        }
      }

      const liftY = -crestFactor * 7;
      const scale = 1 + crestFactor * 0.16;
      BREffectBase.drawStyledText(ctx, ch, {
        x: cursorX,
        y: y + liftY,
        rgbVal,
        alpha: baseOpacity * baseReveal,
        shadowColor: config.shadowColor,
        shadowBlur: crestFactor * 16 * dpr,
        scale,
        pivotX: cursorX + chW / 2,
        pivotY: y - 8 + liftY,
      });
      cursorX += chW;
    }
    ctx.restore();
    return fullTextWidth;
  }
}
