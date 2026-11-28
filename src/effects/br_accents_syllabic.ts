import { BRContext, BREngineConfig } from '../types.ts';
import { BRTags } from '../br_tags.ts';
import { BRAccentsBase, BRRenderSegment } from './br_accents_base.ts';
import { brDict } from '../br_dictionary.ts';
import { BRUtils } from '../br_utils';

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

const CONFIG = {
  DOT_BLUR: 14,
  MIN_ALPHA: 0.005,
  MIN_OPACITY: 0.01,
  PIVOT_Y_OFFSET: 8,
  SLICE_BLEED: 4,

  SINGLE_SYLLABLE: {
    glowBlurMax: 20,
    minScale: 0.85,
    bounceAmp: 0.04,
  },

  PULSE_BASE: {
    defaultSmolderAlpha: 0.42,
    defaultPauseWeight: 1.3,
    defaultAccentWeight: 1.35,
    postStepWeight: 0.9,
    preStepMinAlpha: 0.25,
    preStepGlowBounce: 14,
    preStepGlowPlain: 10,
    preStepMinScale: 0.8,
    preStepBounceAmp: 0.05,
    pauseFadeDrop: 0.1,
    pauseGlowBlur: 8,
    pauseDipAmp: 0.02,
    ignitionPreGlow: 12,
    accentBaseGlow: 8,
    accentPeakGlow: 16,
    accentMinScale: 0.74,
    accentBounceAmp: 0.09,
  },

  FIRE: {
    flameWaves: 2,
    flameLiftY: 16,
    smolderAlpha: 0.42,
    spreadRatio: 0.72,
    tailCompress: 0.75,
    waveDelayStep: 0.14,
    waveEasePower: 2.2,
    waveReachStep: 0.35,
    waveScaleBoost: 0.05,
    waveFadePower: 2.0,
    waveMaxAlpha: 0.45,
    waveDriftX: 8,
    waveScalePivotX: 0.2,
    waveHeightOffsetRatio: 0.35,
  },

  PULSE: {
    smolderAlpha: 0.45,
    pauseWeight: 1.4,
    accentWeight: 1.35,
  },

  RIPPLE: {
    ringsCount: 3,
    waveWidth: 48,
    minTravelDist: 40,
    travelPad: 30,
    waveSpeedMult: 1.25,
    ringDelayStep: 0.14,
    ringScaleXBoost: 0.08,
    ringScaleYBoost: 0.22,
    ringReachStep: 0.3,
    ringFadePower: 1.6,
    ringMaxAlpha: 0.45,
    ringAlphaStep: 0.25,
    textRevealDur: 0.35,
    backCrestRatio: 0.3,
    crestFadeRatio: 0.65,
    crestLiftY: 7,
    crestScaleBoost: 0.16,
    crestGlowBlur: 16,
  },

  SPARKLE: {
    defaultCount: 14,
    minZoneWidth: 12,
    ignitedCountMult: 2,
    fadeOutSpeed: 1.4,
    seedStepPrimary: 73.13,
    seedStepSecondary: 19.37,
    seedFreqX: 1.7,
    seedFreqY: 2.3,
    seedPhaseMult: 3.1,
    blinkThreshold: 0.15,
    blinkPower: 1.8,
    yBaseRatio: 0.05,
    ySpreadRatio: 0.72,
    radiusBase: 0.9,
    radiusVariants: 3,
    radiusStep: 0.45,
    radiusScaleMin: 0.7,
    radiusScaleBoost: 0.5,
  },

  ORBIT: {
    defaultCount: 7,
    minMobileCount: 4,
    centerYRatio: 0.35,
    fadeOutSpeed: 1.2,
    orbitPadX: 12,
    orbitPadY: 7,
    orbitYRatio: 0.48,
    orbitExpandStart: 1.15,
    orbitExpandShrink: 0.25,
    seedStepPrimary: 41.7,
    seedStepSecondary: 17.3,
    angleSpeedBase: 0.65,
    angleSpeedAlt: 0.2,
    driftFreqX: 1.2,
    driftAmpX: 3.5,
    driftFreqY: 1.3,
    driftAmpY: 3,
    pulseBase: 0.55,
    pulseAmp: 0.45,
    pulseFreq: 6,
    lifeSpeed: 1.05,
    maxAlpha: 0.9,
    radiusBase: 1.35,
    radiusVariants: 3,
    radiusStep: 0.4,
  },
} as const;

export class BRAccentsSyllabic {
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
    const ease = BRAccentsBase.easeOutCubic(p);
    const scale = minScale + (1 - minScale) * ease + Math.sin(p * Math.PI) * bounceAmp;

    BRAccentsBase.drawStyledText(ctx, text, {
      x: startX,
      y,
      rgbVal,
      alpha: baseOpacity * ease,
      shadowColor: config.shadowColor,
      shadowBlur: Math.sin(p * Math.PI) * CONFIG.SINGLE_SYLLABLE.glowBlurMax * dpr,
      scale,
      pivotX: startX + textWidth / 2,
      pivotY: y - CONFIG.PIVOT_Y_OFFSET,
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
    const bleed = CONFIG.SLICE_BLEED;
    let cursorX = startX;
    let logicalOffset = 0;

    for (let i = 0; i < count; i++) {
      const partW = segment.syllableWidths?.[i] ?? ctx.measureText(parts[i]).width;
      const startThreshold = count > 1 ? (i / count) * spreadRatio : 0;
      const localT = BRAccentsBase.clamp01((progress - startThreshold) / (1 - startThreshold * tailCompress));

      if (localT > CONFIG.MIN_ALPHA) {
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
    const cfg = CONFIG.PULSE_BASE;
    const smolderAlpha = opts.smolderAlpha ?? cfg.defaultSmolderAlpha;
    const pauseWeight = opts.pauseWeight ?? cfg.defaultPauseWeight;
    const accentWeight = opts.accentWeight ?? cfg.defaultAccentWeight;
    const useBounce = opts.useBounce ?? false;

    const parts = this.getSyllables(segment);
    const count = parts.length;
    const p = BRAccentsBase.clamp01(segment.progress);

    const parsedParam = this.parseSyllableParam(segment.param, count);
    const hasCustomAccent = parsedParam !== null;
    const accentIdx = parsedParam ?? (count - 1);

    const preCount = accentIdx;
    const postCount = count - 1 - accentIdx;
    const actualPauseWeight = hasCustomAccent && preCount > 0 ? pauseWeight : 0;
    const totalWeight = preCount + actualPauseWeight + accentWeight + postCount * cfg.postStepWeight;

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

          const ease = BRAccentsBase.easeOutCubic(stepPhase);
          const pulse = Math.sin(stepPhase * Math.PI);

          BRAccentsBase.drawStyledText(ctx, part, {
            x: cursorX,
            y,
            rgbVal,
            alpha: baseOpacity * (cfg.preStepMinAlpha + (1 - cfg.preStepMinAlpha) * ease),
            shadowColor: config.shadowColor,
            shadowBlur: pulse * (useBounce ? cfg.preStepGlowBounce : cfg.preStepGlowPlain) * dpr,
            scale: useBounce ? cfg.preStepMinScale + (1 - cfg.preStepMinScale) * ease + pulse * cfg.preStepBounceAmp : 1,
            pivotX: cursorX + partW / 2,
          });
        } else {
          BRAccentsBase.drawStyledText(ctx, part, {
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

      BRAccentsBase.drawStyledText(ctx, preText, {
        x: startX,
        y,
        rgbVal,
        alpha: baseOpacity * (smolderAlpha - (useBounce ? pauseT * cfg.pauseFadeDrop : 0)),
        shadowColor: config.shadowColor,
        shadowBlur: useBounce ? cfg.pauseGlowBlur * dpr : 0,
        scale: useBounce ? 1 - Math.sin(pauseT * Math.PI) * cfg.pauseDipAmp : 1,
        pivotX: startX + preW / 2,
      });
    } else if (p < accentEnd) {
      const accentT = (p - pauseEnd) / (accentEnd - pauseEnd);
      const ease = BRAccentsBase.easeOutCubic(accentT);

      ignitionFlash = Math.sin(accentT * Math.PI);
      isIgnited = true;
      activeStep = accentIdx;
      stepPhase = accentT;

      if (preCount > 0) {
        const preText = parts.slice(0, preCount).join('');
        const preW = ctx.measureText(preText).width;
        BRAccentsBase.drawStyledText(ctx, preText, {
          x: startX,
          y,
          rgbVal,
          alpha: baseOpacity * (smolderAlpha + (1 - smolderAlpha) * ease),
          shadowColor: config.shadowColor,
          shadowBlur: ignitionFlash * cfg.ignitionPreGlow * dpr,
        });
        cursorX += preW;
      }

      const accentPart = parts[accentIdx];

      activeX = cursorX;
      activeW = segment.syllableWidths?.[accentIdx] ?? ctx.measureText(accentPart).width;

      BRAccentsBase.drawStyledText(ctx, accentPart, {
        x: cursorX,
        y,
        rgbVal,
        alpha: baseOpacity * ease,
        shadowColor: config.shadowColor,
        shadowBlur: (cfg.accentBaseGlow + ignitionFlash * cfg.accentPeakGlow) * dpr,
        scale: useBounce ? cfg.accentMinScale + (1 - cfg.accentMinScale) * ease + ignitionFlash * cfg.accentBounceAmp : 1,
        pivotX: cursorX + activeW / 2,
      });
    } else {
      isIgnited = true;

      const beforePostText = parts.slice(0, accentIdx + 1).join('');

      BRAccentsBase.drawStyledText(ctx, beforePostText, {
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

          const ease = k === activePostStep ? BRAccentsBase.easeOutCubic(stepPhase) : 1;

          BRAccentsBase.drawStyledText(ctx, part, {
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
      flameWaves: number = CONFIG.FIRE.flameWaves,
      flameLiftY: number = CONFIG.FIRE.flameLiftY,
      smolderAlpha: number = CONFIG.FIRE.smolderAlpha
  ): number {
    const cfg = CONFIG.FIRE;
    const fullTextWidth = BRAccentsBase.getSegmentWidth(ctx, segment);
    const sprite = segment.sprite;
    const p = BRAccentsBase.clamp01(segment.progress);

    if (!sprite) {
      return BRAccentsBase.fallbackText(ctx, segment.text, startX, y, rgbVal, baseOpacity * p);
    }

    const parts = this.getSyllables(segment);
    const fontSize = BRUtils.extractFontSize(config.font);

    ctx.save();
    this.forEachSyllableSlice(ctx, dpr, segment, parts, startX, y, p, cfg.spreadRatio, cfg.tailCompress, (s) => {
      for (let w = 0; w < flameWaves; w++) {
        const waveDelay = w * cfg.waveDelayStep;
        const waveT = BRAccentsBase.clamp01((s.localT - waveDelay) / (1 - waveDelay));
        if (waveT <= 0 || waveT >= 1) {
          continue;
        }
        const easeWave = 1 - Math.pow(1 - waveT, cfg.waveEasePower);
        const reachMult = 1 + w * cfg.waveReachStep;
        const scale = 1 + easeWave * cfg.waveScaleBoost * reachMult;
        const waveAlpha = Math.pow(1 - waveT, cfg.waveFadePower) * (cfg.waveMaxAlpha / (1 + w * cfg.waveReachStep));
        if (waveAlpha > CONFIG.MIN_OPACITY) {
          const waveX = s.drawBaseX + easeWave * cfg.waveDriftX * reachMult - (s.sliceLogicalW * (scale - 1)) * cfg.waveScalePivotX;
          const waveY = s.drawBaseY - fontSize * cfg.waveHeightOffsetRatio - easeWave * flameLiftY * reachMult - (sprite.height * (scale - 1)) * 0.5;
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
      pauseWeight: number = CONFIG.PULSE.pauseWeight,
      accentWeight: number = CONFIG.PULSE.accentWeight
  ): number {
    const textWidth = BRAccentsBase.getSegmentWidth(ctx, segment);
    const parts = this.getSyllables(segment);
    const p = BRAccentsBase.clamp01(segment.progress);

    if (parts.length === 1) {
      const singleCfg = CONFIG.SINGLE_SYLLABLE;
      return this.drawSingleSyllable(ctx, config, dpr, segment.text, textWidth, p, startX, y, rgbVal, baseOpacity, singleCfg.minScale, singleCfg.bounceAmp);
    }

    ctx.save();
    this.renderSyllabicPulseBase(ctx, config, dpr, segment, startX, y, rgbVal, baseOpacity, {
      smolderAlpha: CONFIG.PULSE.smolderAlpha,
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
      ringsCount: number = CONFIG.RIPPLE.ringsCount,
      waveWidth: number = CONFIG.RIPPLE.waveWidth
  ): number {
    const cfg = CONFIG.RIPPLE;
    const fullTextWidth = BRAccentsBase.getSegmentWidth(ctx, segment);
    const parts = this.getSyllables(segment);
    const sprite = segment.sprite;
    const p = BRAccentsBase.clamp01(segment.progress);
    const epicentreIdx = this.parseSyllableParam(segment.param, parts.length);
    let epicentreX = 0;

    if (epicentreIdx !== null) {
      let accW = 0;

      for (let i = 0; i < epicentreIdx; i++) {
        accW += segment.syllableWidths?.[i] ?? ctx.measureText(parts[i]).width;
      }

      epicentreX = accW + (segment.syllableWidths?.[epicentreIdx] ?? ctx.measureText(parts[epicentreIdx]).width) / 2;
    }

    const travelDistance = Math.max(fullTextWidth - epicentreX, cfg.minTravelDist) + cfg.travelPad;
    const waveRadius = p * travelDistance * cfg.waveSpeedMult;
    ctx.save();

    if (sprite) {
      for (let ring = 0; ring < ringsCount; ring++) {
        const ringDelay = ring * cfg.ringDelayStep;
        const ringT = BRAccentsBase.clamp01((p - ringDelay) / (1 - ringDelay));

        if (ringT <= 0 || ringT >= 1) {
          continue;
        }

        const easeRing = BRAccentsBase.easeOutQuad(ringT);
        const scaleX = 1 + easeRing * cfg.ringScaleXBoost * (1 + ring * cfg.ringReachStep);
        const scaleY = 1 + easeRing * cfg.ringScaleYBoost * (1 + ring * cfg.ringReachStep);
        const ringAlpha = Math.pow(1 - ringT, cfg.ringFadePower) * (cfg.ringMaxAlpha / (1 + ring * cfg.ringAlphaStep));

        if (ringAlpha > CONFIG.MIN_OPACITY) {
          const pivotX = startX + epicentreX;
          const pivotY = y - CONFIG.PIVOT_Y_OFFSET;
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
    const baseReveal = BRAccentsBase.easeOutCubic(BRAccentsBase.clamp01(p / cfg.textRevealDur));
    let cursorX = startX;

    for (let c = 0; c < chars.length; c++) {
      const ch = chars[c];
      const chW = segment.charWidths?.[c] ?? ctx.measureText(ch).width;
      const charCenterRel = (cursorX - startX) + chW / 2;
      const distForward = charCenterRel - epicentreX;
      let crestFactor = 0;

      if (distForward >= -waveWidth * cfg.backCrestRatio) {
        const crestDelta = Math.abs(distForward - waveRadius);

        if (crestDelta < waveWidth) {
          crestFactor = Math.cos((crestDelta / waveWidth) * (Math.PI / 2)) * (1 - p * cfg.crestFadeRatio);
        }
      }
      const liftY = -crestFactor * cfg.crestLiftY;
      const scale = 1 + crestFactor * cfg.crestScaleBoost;

      BRAccentsBase.drawStyledText(ctx, ch, {
        x: cursorX,
        y: y + liftY,
        rgbVal,
        alpha: baseOpacity * baseReveal,
        shadowColor: config.shadowColor,
        shadowBlur: crestFactor * cfg.crestGlowBlur * dpr,
        scale,
        pivotX: cursorX + chW / 2,
        pivotY: y - CONFIG.PIVOT_Y_OFFSET + liftY,
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
      sparklesCount: number = CONFIG.SPARKLE.defaultCount
  ): number {
    const cfg = CONFIG.SPARKLE;
    const fullTextWidth = BRAccentsBase.getSegmentWidth(ctx, segment);
    const fontSize = BRUtils.extractFontSize(config.font);

    ctx.save();

    const state = this.renderSyllabicPulseBase(ctx, config, dpr, segment, startX, y, rgbVal, baseOpacity);
    const zoneX = state.isIgnited ? startX : state.activeX;
    const zoneW = state.isIgnited ? fullTextWidth : Math.max(cfg.minZoneWidth, state.activeW);
    const baseCount = BRAccentsBase.isMobileViewport() ? Math.round(sparklesCount * brDict['MOBILE_PARTICLE_RATIO']) : sparklesCount;
    const count = state.isIgnited ? baseCount * cfg.ignitedCountMult : baseCount;
    const fadeOut = state.isIgnited ? Math.max(0, 1 - state.stepPhase * cfg.fadeOutSpeed) : 1;

    if (fadeOut > CONFIG.MIN_OPACITY && zoneW > 0) {
      const dot = BRAccentsBase.getGlowDot(config.activeTextColor, CONFIG.DOT_BLUR);

      for (let i = 0; i < count; i++) {
        const seed = (state.activeStep + 1) * cfg.seedStepPrimary + i * cfg.seedStepSecondary;
        const rx = Math.abs(Math.sin(seed * cfg.seedFreqX));
        const ry = Math.abs(Math.cos(seed * cfg.seedFreqY));
        const phase = (seed * cfg.seedPhaseMult) % (Math.PI * 2);
        const blink = Math.sin(state.stepPhase * Math.PI * 2 + phase);

        if (blink <= cfg.blinkThreshold) {
          continue;
        }

        const sparkleAlpha = Math.pow((blink - cfg.blinkThreshold) / (1 - cfg.blinkThreshold), cfg.blinkPower) * fadeOut;
        const px = zoneX + rx * zoneW;
        const py = y - fontSize * (cfg.yBaseRatio + ry * cfg.ySpreadRatio);
        const radius = (cfg.radiusBase + (i % cfg.radiusVariants) * cfg.radiusStep) * (cfg.radiusScaleMin + sparkleAlpha * cfg.radiusScaleBoost);
        BRAccentsBase.drawGlowDot(ctx, dot, px, py, radius, baseOpacity * sparkleAlpha);
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
      firefliesCount: number = CONFIG.ORBIT.defaultCount
  ): number {
    const cfg = CONFIG.ORBIT;
    const fullTextWidth = BRAccentsBase.getSegmentWidth(ctx, segment);
    const fontSize = BRUtils.extractFontSize(config.font);

    ctx.save();

    const state = this.renderSyllabicPulseBase(ctx, config, dpr, segment, startX, y, rgbVal, baseOpacity);
    const centerX = state.activeX + state.activeW / 2;
    const centerY = y - fontSize * cfg.centerYRatio;
    const fadeOut = state.isIgnited ? Math.max(0, 1 - state.stepPhase * cfg.fadeOutSpeed) : 1;
    const actualCount = BRAccentsBase.isMobileViewport() ? Math.max(cfg.minMobileCount, Math.round(firefliesCount * brDict['MOBILE_PARTICLE_RATIO'])) : firefliesCount;

    if (fadeOut > CONFIG.MIN_OPACITY && state.activeW > 0) {
      const dot = BRAccentsBase.getGlowDot(config.activeTextColor, CONFIG.DOT_BLUR);
      const easeIn = BRAccentsBase.easeOutCubic(state.stepPhase);
      const orbitRadiusX = (state.activeW * 0.5 + cfg.orbitPadX) * (cfg.orbitExpandStart - cfg.orbitExpandShrink * easeIn);
      const orbitRadiusY = (fontSize * cfg.orbitYRatio + cfg.orbitPadY) * (cfg.orbitExpandStart - cfg.orbitExpandShrink * easeIn);

      for (let i = 0; i < actualCount; i++) {
        const seed = (state.activeStep + 1) * cfg.seedStepPrimary + i * cfg.seedStepSecondary;
        const slowAngle = (i / actualCount) * Math.PI * 2 + state.stepPhase * (cfg.angleSpeedBase + (i % 2) * cfg.angleSpeedAlt);
        const driftX = Math.sin(state.stepPhase * cfg.driftFreqX + seed) * cfg.driftAmpX;
        const driftY = Math.cos(state.stepPhase + seed * cfg.driftFreqY) * cfg.driftAmpY;
        const px = centerX + Math.cos(slowAngle) * orbitRadiusX + driftX;
        const py = centerY + Math.sin(slowAngle) * orbitRadiusY + driftY;
        const glowPulse = cfg.pulseBase + cfg.pulseAmp * Math.sin(segment.progress * cfg.pulseFreq + seed);
        const lifeAlpha = Math.sin(Math.min(1, state.stepPhase * cfg.lifeSpeed) * Math.PI);
        const particleAlpha = lifeAlpha * fadeOut * glowPulse * cfg.maxAlpha;

        if (particleAlpha <= CONFIG.MIN_OPACITY) {
          continue;
        }

        BRAccentsBase.drawGlowDot(ctx, dot, px, py, cfg.radiusBase + (i % cfg.radiusVariants) * cfg.radiusStep, baseOpacity * particleAlpha);
      }
    }

    ctx.restore();

    return fullTextWidth;
  }
}
