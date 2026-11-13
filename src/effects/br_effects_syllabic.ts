import { BRContext, BREngineConfig } from '../types.ts';
import { BRTags } from '../br_tags.ts';
import { BREffectBase, BRRenderSegment } from './br_effects_base.ts';

interface BRSyllableSliceContext {
  index: number;
  localT: number;
  srcX: number;
  srcW: number;
  sliceLogicalW: number;
  drawBaseX: number;
  drawBaseY: number;
}

interface BRPulseRenderState {
  activeX: number;
  activeW: number;
  activeStep: number;
  stepPhase: number;
  isIgnited: boolean;
  ignitionFlash: number;
}

interface BRPulseStyleOptions {
  smolderAlpha?: number;
  pauseWeight?: number;
  accentWeight?: number;
  useBounce?: boolean;
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
      segment: BRRenderSegment,
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
      const partW = segment.syllableWidths?.[i] ?? ctx.measureText(parts[i]).width;
      const startThreshold = count > 1 ? (i / count) * spreadRatio : 0;
      const localT = BREffectBase.clamp01((progress - startThreshold) / (1 - startThreshold * tailCompress));

      if (localT > 0.005) {
        const sprite = segment.sprite;
        const glyphStart = sprite!.padX + logicalOffset;
        const sliceLeft = Math.max(0, glyphStart - bleed);
        const sliceRight = Math.min(sprite!.width, glyphStart + partW + bleed);
        const sliceLogicalW = Math.max(1, sliceRight - sliceLeft);

        onSlice({
          index: i,
          localT,
          srcX: Math.round(sliceLeft * dpr),
          srcW: Math.round(sliceLogicalW * dpr),
          sliceLogicalW,
          drawBaseX: cursorX - (glyphStart - sliceLeft),
          drawBaseY: y - sprite!.baselineY,
        });
      }

      cursorX += partW;
      logicalOffset += partW;
    }
  }

  private static renderSyllabicPulseBase (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      opts: BRPulseStyleOptions = {}
  ): BRPulseRenderState {
    const smolderAlpha = opts.smolderAlpha ?? 0.42;
    const pauseWeight = opts.pauseWeight ?? 1.3;
    const accentWeight = opts.accentWeight ?? 1.35;
    const useBounce = opts.useBounce ?? false;

    const parts = this.getSyllables(segment);
    const count = parts.length;
    const p = BREffectBase.clamp01(segment.progress);

    const parsedParam = this.parseSyllableParam(segment.param, count);
    const hasCustomAccent = parsedParam !== null;
    const accentIdx = parsedParam ?? (count - 1);

    const preCount = accentIdx;
    const postCount = count - 1 - accentIdx;
    const actualPauseWeight = hasCustomAccent && preCount > 0 ? pauseWeight : 0;
    const postStepWeight = 0.9;
    const totalWeight = preCount + actualPauseWeight + accentWeight + postCount * postStepWeight;

    const preEnd = preCount / totalWeight;
    const pauseEnd = (preCount + actualPauseWeight) / totalWeight;
    const accentEnd = (preCount + actualPauseWeight + accentWeight) / totalWeight;

    let cursorX = startX;
    let activeX = startX;
    let activeW = 0;
    let activeStep;
    let stepPhase;
    let isIgnited = false;
    let ignitionFlash = 0;

    if (p < preEnd && preCount > 0) {
      const stepFloat = (p / preEnd) * preCount;
      activeStep = Math.floor(stepFloat);
      stepPhase = stepFloat - activeStep;

      for (let i = 0; i <= activeStep; i++) {
        const part = parts[i];
        const partW = segment.syllableWidths?.[i] ?? ctx.measureText(part).width;

        if (i === activeStep) {
          activeX = cursorX;
          activeW = partW;
          const ease = BREffectBase.easeOutCubic(stepPhase);
          const pulse = Math.sin(stepPhase * Math.PI);
          BREffectBase.drawStyledText(ctx, part, {
            x: cursorX,
            y,
            rgbVal,
            alpha: baseOpacity * (0.25 + 0.75 * ease),
            shadowColor: config.shadowColor,
            shadowBlur: pulse * (useBounce ? 14 : 10) * dpr,
            scale: useBounce ? 0.8 + 0.2 * ease + pulse * 0.05 : 1,
            pivotX: cursorX + partW / 2,
          });
        } else {
          BREffectBase.drawStyledText(ctx, part, {
            x: cursorX,
            y,
            rgbVal,
            alpha: baseOpacity * smolderAlpha,
          });
        }
        cursorX += partW;
      }
    } else if (p < pauseEnd && actualPauseWeight > 0) {
      const pauseT = (p - preEnd) / (pauseEnd - preEnd);
      const preText = parts.slice(0, preCount).join('');
      const preW = ctx.measureText(preText).width;
      activeStep = Math.max(0, preCount - 1);
      stepPhase = 1;
      activeW = ctx.measureText(parts[activeStep]).width;
      activeX = startX + preW - activeW;

      BREffectBase.drawStyledText(ctx, preText, {
        x: startX,
        y,
        rgbVal,
        alpha: baseOpacity * (smolderAlpha - (useBounce ? pauseT * 0.1 : 0)),
        shadowColor: config.shadowColor,
        shadowBlur: useBounce ? 8 * dpr : 0,
        scale: useBounce ? 1 - Math.sin(pauseT * Math.PI) * 0.02 : 1,
        pivotX: startX + preW / 2,
      });
    } else if (p < accentEnd) {
      const accentT = (p - pauseEnd) / (accentEnd - pauseEnd);
      const ease = BREffectBase.easeOutCubic(accentT);
      ignitionFlash = Math.sin(accentT * Math.PI);
      isIgnited = true;
      activeStep = accentIdx;
      stepPhase = accentT;

      if (preCount > 0) {
        const preText = parts.slice(0, preCount).join('');
        const preW = ctx.measureText(preText).width;
        BREffectBase.drawStyledText(ctx, preText, {
          x: startX,
          y,
          rgbVal,
          alpha: baseOpacity * (smolderAlpha + (1 - smolderAlpha) * ease),
          shadowColor: config.shadowColor,
          shadowBlur: ignitionFlash * 12 * dpr,
        });
        cursorX += preW;
      }

      const accentPart = parts[accentIdx];
      activeX = cursorX;
      activeW = segment.syllableWidths?.[accentIdx] ?? ctx.measureText(accentPart).width;

      BREffectBase.drawStyledText(ctx, accentPart, {
        x: cursorX,
        y,
        rgbVal,
        alpha: baseOpacity * ease,
        shadowColor: config.shadowColor,
        shadowBlur: (8 + ignitionFlash * 16) * dpr,
        scale: useBounce ? 0.74 + 0.26 * ease + ignitionFlash * 0.09 : 1,
        pivotX: cursorX + activeW / 2,
      });
    } else {
      isIgnited = true;
      const beforePostText = parts.slice(0, accentIdx + 1).join('');
      BREffectBase.drawStyledText(ctx, beforePostText, {
        x: startX,
        y,
        rgbVal,
        alpha: baseOpacity,
      });
      cursorX += ctx.measureText(beforePostText).width;
      activeStep = accentIdx;
      stepPhase = 1;

      if (postCount > 0) {
        const postP = (p - accentEnd) / (1 - accentEnd);
        const stepFloat = postP * postCount;
        const activePostStep = Math.floor(stepFloat);
        stepPhase = stepFloat - activePostStep;
        activeStep = accentIdx + 1 + activePostStep;

        for (let k = 0; k <= activePostStep && k < postCount; k++) {
          const idx = accentIdx + 1 + k;
          const part = parts[idx];
          const partW = segment.syllableWidths?.[idx] ?? ctx.measureText(part).width;
          if (k === activePostStep) {
            activeX = cursorX;
            activeW = partW;
          }
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

    return { activeX, activeW, activeStep, stepPhase, isIgnited, ignitionFlash };
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
      flameLiftY: number = 16,
      smolderAlpha: number = 0.42
  ): number {
    const fullTextWidth = BREffectBase.getSegmentWidth(ctx, segment);
    const sprite = segment.sprite;
    const p = BREffectBase.clamp01(segment.progress);
    if (!sprite) {
      return BREffectBase.fallbackText(ctx, segment.text, startX, y, rgbVal, baseOpacity * p);
    }

    const parts = this.getSyllables(segment);
    const fontSize = BREffectBase.extractFontSize(config.font);
    ctx.save();
    this.forEachSyllableSlice(ctx, dpr, segment, parts, startX, y, p, 0.72, 0.75, (s) => {
      for (let w = 0; w < flameWaves; w++) {
        const waveDelay = w * 0.14;
        const waveT = BREffectBase.clamp01((s.localT - waveDelay) / (1 - waveDelay));
        if (waveT <= 0 || waveT >= 1) {
          continue;
        }
        const easeWave = 1 - Math.pow(1 - waveT, 2.2);
        const reachMult = 1 + w * 0.35;
        const scale = 1 + easeWave * 0.05 * reachMult;
        const waveAlpha = Math.pow(1 - waveT, 2.0) * (0.45 / (1 + w * 0.35));
        if (waveAlpha > 0.01) {
          const waveX = s.drawBaseX + easeWave * 8 * reachMult - (s.sliceLogicalW * (scale - 1)) * 0.2;
          const waveY = s.drawBaseY - fontSize * 0.35 - easeWave * flameLiftY * reachMult - (sprite.height * (scale - 1)) * 0.5;
          ctx.globalAlpha = baseOpacity * waveAlpha;
          ctx.drawImage(sprite.glowCanvas, s.srcX, 0, s.srcW, sprite.canvas.height, waveX, waveY, s.sliceLogicalW * scale, sprite.height * scale);
        }
      }
    });
    ctx.restore();
    ctx.save();
    this.renderSyllabicPulseBase(ctx, config, dpr, segment, startX, y, rgbVal, baseOpacity, { smolderAlpha });
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
      pauseWeight: number = 1.4,
      accentWeight: number = 1.35
  ): number {
    const textWidth = BREffectBase.getSegmentWidth(ctx, segment);
    const parts = this.getSyllables(segment);
    const p = BREffectBase.clamp01(segment.progress);
    if (parts.length === 1) {
      return this.drawSingleSyllable(ctx, config, dpr, segment.text, textWidth, p, startX, y, rgbVal, baseOpacity, 0.85, 0.04);
    }
    ctx.save();
    this.renderSyllabicPulseBase(ctx, config, dpr, segment, startX, y, rgbVal, baseOpacity, {
      smolderAlpha: 0.45,
      pauseWeight,
      accentWeight,
      useBounce: true,
    });
    ctx.restore();
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
    const fullTextWidth = BREffectBase.getSegmentWidth(ctx, segment);
    const parts = this.getSyllables(segment);
    const sprite = segment.sprite;
    const p = BREffectBase.clamp01(segment.progress);
    const epicentreIdx = this.parseSyllableParam(segment.param, parts.length);
    let epicentreX = 0;

    if (epicentreIdx !== null) {
      let accW = 0;
      for (let i = 0; i < epicentreIdx; i++) {
        accW += segment.syllableWidths?.[i] ?? ctx.measureText(parts[i]).width;
      }
      epicentreX = accW + (segment.syllableWidths?.[epicentreIdx] ?? ctx.measureText(parts[epicentreIdx]).width) / 2;
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
      const chW = segment.charWidths?.[c] ?? ctx.measureText(ch).width;
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

  public static drawSparkle (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      sparklesCount: number = 14
  ): number {
    const fullTextWidth = BREffectBase.getSegmentWidth(ctx, segment);
    const fontSize = BREffectBase.extractFontSize(config.font);
    ctx.save();
    const state = this.renderSyllabicPulseBase(ctx, config, dpr, segment, startX, y, rgbVal, baseOpacity);
    const zoneX = state.isIgnited ? startX : state.activeX;
    const zoneW = state.isIgnited ? fullTextWidth : Math.max(12, state.activeW);
    const count = state.isIgnited ? sparklesCount * 2 : sparklesCount;
    const fadeOut = state.isIgnited ? Math.max(0, 1 - state.stepPhase * 1.4) : 1;

    ctx.fillStyle = config.activeTextColor;
    ctx.shadowColor = config.shadowColor;
    ctx.shadowBlur = 12 * dpr;

    if (fadeOut > 0.01 && zoneW > 0) {
      for (let i = 0; i < count; i++) {
        const seed = (state.activeStep + 1) * 73.13 + i * 19.37;
        const rx = Math.abs(Math.sin(seed * 1.7));
        const ry = Math.abs(Math.cos(seed * 2.3));
        const phase = (seed * 3.1) % (Math.PI * 2);
        const blink = Math.sin(state.stepPhase * Math.PI * 2 + phase);
        if (blink <= 0.15) {
          continue;
        }
        const sparkleAlpha = Math.pow((blink - 0.15) / 0.85, 1.8) * fadeOut;
        const px = zoneX + rx * zoneW;
        const py = y - fontSize * (0.05 + ry * 0.72);
        const radius = (0.9 + (i % 3) * 0.45) * (0.7 + sparkleAlpha * 0.5);
        ctx.globalAlpha = baseOpacity * sparkleAlpha;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return fullTextWidth;
  }

  public static drawOrbit (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      firefliesCount: number = 7
  ): number {
    const fullTextWidth = BREffectBase.getSegmentWidth(ctx, segment);
    const fontSize = BREffectBase.extractFontSize(config.font);
    ctx.save();
    const state = this.renderSyllabicPulseBase(ctx, config, dpr, segment, startX, y, rgbVal, baseOpacity);
    const centerX = state.activeX + state.activeW / 2;
    const centerY = y - fontSize * 0.35;
    const fadeOut = state.isIgnited ? Math.max(0, 1 - state.stepPhase * 1.2) : 1;

    ctx.fillStyle = config.activeTextColor;
    ctx.shadowColor = config.shadowColor;
    ctx.shadowBlur = 12 * dpr;

    if (fadeOut > 0.01 && state.activeW > 0) {
      const easeIn = BREffectBase.easeOutCubic(state.stepPhase);
      const orbitRadiusX = (state.activeW * 0.5 + 12) * (1.15 - 0.25 * easeIn);
      const orbitRadiusY = (fontSize * 0.48 + 7) * (1.15 - 0.25 * easeIn);

      for (let i = 0; i < firefliesCount; i++) {
        const seed = (state.activeStep + 1) * 41.7 + i * 17.3;
        const slowAngle = (i / firefliesCount) * Math.PI * 2 + state.stepPhase * (0.65 + (i % 2) * 0.2);
        const driftX = Math.sin(state.stepPhase * 1.2 + seed) * 3.5;
        const driftY = Math.cos(state.stepPhase + seed * 1.3) * 3;
        const px = centerX + Math.cos(slowAngle) * orbitRadiusX + driftX;
        const py = centerY + Math.sin(slowAngle) * orbitRadiusY + driftY;
        const glowPulse = 0.55 + 0.45 * Math.sin(segment.progress * 6 + seed);
        const lifeAlpha = Math.sin(Math.min(1, state.stepPhase * 1.05) * Math.PI);
        const particleAlpha = lifeAlpha * fadeOut * glowPulse * 0.9;
        if (particleAlpha <= 0.01) {
          continue;
        }
        ctx.globalAlpha = baseOpacity * particleAlpha;
        ctx.beginPath();
        ctx.arc(px, py, 1.35 + (i % 3) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return fullTextWidth;
  }
}
