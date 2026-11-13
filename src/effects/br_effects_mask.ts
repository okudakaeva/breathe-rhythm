import { BRContext, BREngineConfig } from '../types.ts';
import { BREffectBase, BRMaskParticle, BRRenderSegment } from './br_effects_base.ts';

export type BRTextMaskMode = 'sand' | 'fireflies' | 'glitter' | 'breeze' | 'frost' | 'constellation';

export class BRMaskEffects {
  private static drawMaskParticles (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      grains: BRMaskParticle[],
      startX: number,
      y: number,
      baseOpacity: number,
      calcState: (g: BRMaskParticle) => { localT: number; alpha: number; blur: number; size: number; ease: number } | null
  ): void {
    ctx.save();
    ctx.fillStyle = config.activeTextColor;
    ctx.shadowColor = config.shadowColor;
    ctx.shadowBlur = 8 * dpr;

    for (let i = 0; i < grains.length; i++) {
      const g = grains[i];
      const state = calcState(g);
      if (!state || state.alpha <= 0.005) {
        continue;
      }

      const dx = g.targetX - g.startX;
      const dy = g.targetY - g.startY;
      const dist = Math.hypot(dx, dy) || 1;
      const wave = Math.sin(state.localT * g.zigzagFreq + g.phase) * g.zigzagAmp * (1 - state.ease);

      const curX = startX + g.startX + dx * state.ease + (-dy / dist) * wave;
      const curY = y + g.startY + dy * state.ease + (dx / dist) * wave;

      ctx.globalAlpha = baseOpacity * state.alpha;
      ctx.beginPath();
      ctx.arc(curX, curY, state.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ============================================================================
  // ПУБЛИЧНЫЙ API
  // ============================================================================

  public static buildConstellationLinks (
      grains: BRMaskParticle[],
      maxLinkDist: number = 22
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
      alphaThreshold: number = 110
  ): BRMaskParticle[] {
    ctx.font = font;
    const textWidth = Math.ceil(ctx.measureText(text).width);
    const fontSize = BREffectBase.extractFontSize(font);

    const padX = 16;
    const padY = Math.ceil(fontSize * 0.7);
    const maskW = Math.max(10, textWidth + padX * 2);
    const maskH = Math.max(10, Math.ceil(fontSize * 1.6) + padY * 2);
    const baselineY = padY + fontSize;

    const offscreen = document.createElement('canvas');
    offscreen.width = maskW;
    offscreen.height = maskH;
    const octx = offscreen.getContext('2d');
    if (!octx) {
      return [];
    }

    octx.font = font;
    octx.textAlign = 'left';
    octx.textBaseline = 'alphabetic';
    octx.fillStyle = '#ffffff';
    octx.fillText(text, padX, baselineY);

    const imgData = octx.getImageData(0, 0, maskW, maskH).data;
    const grains: BRMaskParticle[] = [];
    const step = mode === 'constellation' ? 6 : mode === 'fireflies' ? 3 : 2;

    const frostSeedsCount = Math.max(2, Math.ceil(text.length / 4));
    const frostSeeds: Array<{ x: number; y: number }> = [];
    if (mode === 'frost') {
      for (let s = 0; s < frostSeedsCount; s++) {
        frostSeeds.push({
          x: ((s + 0.2 + Math.random() * 0.6) / frostSeedsCount) * Math.max(1, textWidth),
          y: -fontSize * (0.15 + Math.random() * 0.55),
        });
      }
    }

    for (let py = 0; py < maskH; py += step) {
      for (let px = 0; px < maskW; px += step) {
        if (imgData[(py * maskW + px) * 4 + 3] <= alphaThreshold) {
          continue;
        }

        const targetX = px - padX;
        const targetY = py - baselineY;
        const xNorm = BREffectBase.clamp01(targetX / Math.max(1, textWidth));

        if (mode === 'frost') {
          let minDist = Infinity;
          for (let s = 0; s < frostSeeds.length; s++) {
            const d = Math.hypot(targetX - frostSeeds[s].x, targetY - frostSeeds[s].y);
            if (d < minDist) {
              minDist = d;
            }
          }
          const maxSpread = Math.max(40, textWidth / frostSeedsCount);
          const distRatio = BREffectBase.clamp01(minDist / maxSpread);
          grains.push({
            targetX,
            targetY,
            startX: targetX,
            startY: targetY,
            size: Math.random() * 1.1 + 0.7,
            zigzagFreq: 0,
            zigzagAmp: 0,
            phase: Math.random() * Math.PI * 2,
            delayRatio: distRatio * 0.55 + Math.random() * 0.08,
            pulseSpeed: 10 + Math.random() * 10,
          });
        } else if (mode === 'constellation') {
          grains.push({
            targetX,
            targetY,
            startX: targetX + (Math.random() - 0.5) * 6,
            startY: targetY + (Math.random() - 0.5) * 6,
            size: Math.random() * 1.3 + 1.1,
            zigzagFreq: 0,
            zigzagAmp: 0,
            phase: Math.random() * Math.PI * 2,
            delayRatio: xNorm * 0.35 + Math.random() * 0.1,
            pulseSpeed: 8 + Math.random() * 8,
          });
        } else if (mode === 'breeze') {
          const windDist = 140 + Math.random() * 160;
          grains.push({
            targetX,
            targetY,
            startX: targetX - windDist,
            startY: targetY + (Math.random() - 0.5) * 42,
            size: Math.random() * 1.15 + 0.55,
            zigzagFreq: (1.2 + Math.random() * 1.6) * Math.PI,
            zigzagAmp: (Math.random() - 0.5) * 18,
            phase: Math.random() * Math.PI * 2,
            delayRatio: xNorm * 0.48 + Math.random() * 0.1,
            pulseSpeed: 0,
          });
        } else if (mode === 'glitter') {
          grains.push({
            targetX,
            targetY,
            startX: targetX,
            startY: targetY,
            size: Math.random() * 1.1 + 0.7,
            zigzagFreq: 0,
            zigzagAmp: 0,
            phase: Math.random() * Math.PI * 2,
            delayRatio: xNorm * 0.65,
            pulseSpeed: 14 + Math.random() * 18,
          });
        } else if (mode === 'fireflies') {
          const angle = Math.random() * Math.PI * 2;
          const radius = 14 + Math.random() * 28;
          grains.push({
            targetX,
            targetY,
            startX: targetX + Math.cos(angle) * radius - 10,
            startY: targetY + Math.sin(angle) * radius,
            size: Math.random() * 1.6 + 1.2,
            zigzagFreq: (Math.random() * 1.2 + 0.8) * Math.PI,
            zigzagAmp: (Math.random() - 0.5) * 16,
            phase: Math.random() * Math.PI * 2,
            delayRatio: xNorm * 0.6 + Math.random() * 0.06,
            pulseSpeed: 6 + Math.random() * 6,
          });
        } else {
          grains.push({
            targetX,
            targetY,
            startX: targetX + (Math.random() - 0.35) * 48,
            startY: targetY + (Math.random() - 0.5) * 32,
            size: Math.random() * 1.3 + 0.8,
            zigzagFreq: (Math.random() * 2 + 1.5) * Math.PI,
            zigzagAmp: (Math.random() - 0.5) * 14,
            phase: Math.random() * Math.PI * 2,
            delayRatio: xNorm * 0.25 + Math.random() * 0.1,
            pulseSpeed: 0,
          });
        }
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
      travelWindow: number = 0.36
  ): number {
    const textWidth = segment.totalWidth ?? ctx.measureText(segment.text).width;
    const grains = segment.grains;
    if (!grains || grains.length === 0) {
      return BREffectBase.fallbackText(ctx, segment.text, startX, y, rgbVal, baseOpacity * segment.progress);
    }

    const chars = Array.from(segment.text);
    const totalChars = Math.max(1, chars.length);
    let charCursorX = startX;

    for (let c = 0; c < chars.length; c++) {
      const ch = chars[c];
      const chW = segment.charWidths?.[c] ?? ctx.measureText(ch).width;
      const charStart = (c / totalChars) * 0.55 + 0.22;
      const charReveal = BREffectBase.clamp01((segment.progress - charStart) / 0.28);

      if (charReveal > 0.01) {
        const easeChar = BREffectBase.easeOutQuad(charReveal);
        BREffectBase.drawStyledText(ctx, ch, {
          x: charCursorX,
          y,
          rgbVal,
          alpha: baseOpacity * easeChar,
          shadowColor: config.shadowColor,
          shadowBlur: (1 - easeChar) * 18 * dpr,
        });
      }
      charCursorX += chW;
    }

    this.drawMaskParticles(ctx, config, dpr, grains, startX, y, baseOpacity, (g) => {
      const localT = BREffectBase.clamp01((segment.progress - g.delayRatio) / travelWindow);
      if (localT <= 0) {
        return null;
      }
      const settleOvertime = Math.max(0, (segment.progress - (g.delayRatio + travelWindow)) / 0.25);
      if (settleOvertime >= 1) {
        return null;
      }
      const ease = 1 - Math.pow(1 - localT, 4);
      const pulse = 0.75 + 0.25 * Math.sin(segment.progress * g.pulseSpeed + g.phase);
      return {
        localT,
        ease,
        alpha: Math.min(1, localT * 3.5) * (1 - settleOvertime) * pulse,
        blur: 10 + 8 * pulse,
        size: g.size * (1.1 - ease * 0.2),
      };
    });

    return textWidth;
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
      revealStart: number = 0.45
  ): number {
    const textWidth = segment.totalWidth ?? ctx.measureText(segment.text).width;
    const grains = segment.grains;
    if (!grains || grains.length === 0) {
      return BREffectBase.fallbackText(ctx, segment.text, startX, y, rgbVal, baseOpacity * segment.progress);
    }
    const textReveal = BREffectBase.clamp01((segment.progress - revealStart) / (1 - revealStart));
    if (textReveal > 0) {
      const easeText = BREffectBase.easeOutQuad(textReveal);
      BREffectBase.drawStyledText(ctx, segment.text, {
        x: startX,
        y,
        rgbVal,
        alpha: baseOpacity * easeText,
        shadowColor: config.shadowColor,
        shadowBlur: (1 - easeText) * 14 * dpr,
      });
    }
    const grainFadeOut = 1 - BREffectBase.clamp01((segment.progress - 0.65) / 0.35);
    if (grainFadeOut > 0.01) {
      this.drawMaskParticles(ctx, config, dpr, grains, startX, y, baseOpacity, (g) => {
        const localT = BREffectBase.clamp01((segment.progress - g.delayRatio) / (0.75 - g.delayRatio * 0.5));
        if (localT <= 0) {
          return null;
        }
        const ease = BREffectBase.easeOutCubic(localT);
        return {
          localT,
          ease,
          alpha: Math.min(1, localT * 3) * grainFadeOut * 0.9,
          blur: 6,
          size: g.size * (1 - ease * 0.25),
        };
      });
    }
    return textWidth;
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
    const textWidth = segment.totalWidth ?? ctx.measureText(segment.text).width;
    const grains = segment.grains;
    if (!grains || grains.length === 0) {
      return BREffectBase.fallbackText(ctx, segment.text, startX, y, rgbVal, baseOpacity * segment.progress);
    }
    const p = BREffectBase.clamp01(segment.progress);
    const chars = Array.from(segment.text);
    const totalChars = Math.max(1, chars.length);
    let charCursorX = startX;

    for (let c = 0; c < chars.length; c++) {
      const ch = chars[c];
      const chW = segment.charWidths?.[c] ?? ctx.measureText(ch).width;
      const charStart = (c / totalChars) * 0.65;
      const charReveal = BREffectBase.clamp01((p - charStart) / 0.25);
      if (charReveal > 0.01) {
        const easeChar = BREffectBase.easeOutQuad(charReveal);
        const finalSettle = BREffectBase.easeOutCubic(BREffectBase.clamp01((p - 0.75) / 0.25));
        const charAlpha = easeChar * (0.72 + 0.28 * finalSettle);
        BREffectBase.drawStyledText(ctx, ch, {
          x: charCursorX,
          y,
          rgbVal,
          alpha: baseOpacity * charAlpha,
        });
      }
      charCursorX += chW;
    }
    const glitterFadeOut = 1 - BREffectBase.clamp01((p - 0.78) / 0.22);
    if (glitterFadeOut > 0.01) {
      this.drawMaskParticles(ctx, config, dpr, grains, startX, y, baseOpacity, (g) => {
        if (p < g.delayRatio) {
          return null;
        }
        const rawWave = Math.sin(p * g.pulseSpeed + g.phase);
        if (rawWave <= 0.2) {
          return null;
        }
        const sparkle = Math.pow((rawWave - 0.2) / 0.8, 2.2);
        return {
          localT: 1,
          ease: 1,
          alpha: sparkle * glitterFadeOut,
          blur: 6 + sparkle * 10,
          size: g.size * (0.8 + sparkle * 0.6),
        };
      });
    }
    return textWidth;
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
    const textWidth = segment.totalWidth ?? ctx.measureText(segment.text).width;
    const grains = segment.grains;
    if (!grains || grains.length === 0) {
      return BREffectBase.fallbackText(ctx, segment.text, startX, y, rgbVal, baseOpacity * segment.progress);
    }
    const p = BREffectBase.clamp01(segment.progress);
    const chars = Array.from(segment.text);
    const totalChars = Math.max(1, chars.length);
    let charCursorX = startX;

    for (let c = 0; c < chars.length; c++) {
      const ch = chars[c];
      const chW = segment.charWidths?.[c] ?? ctx.measureText(ch).width;
      const charStart = (c / totalChars) * 0.45 + 0.32;
      const charReveal = BREffectBase.clamp01((p - charStart) / 0.25);
      if (charReveal > 0.01) {
        const easeChar = BREffectBase.easeOutQuad(charReveal);
        BREffectBase.drawStyledText(ctx, ch, {
          x: charCursorX,
          y,
          rgbVal,
          alpha: baseOpacity * easeChar,
          shadowColor: config.shadowColor,
          shadowBlur: (1 - easeChar) * 12 * dpr,
        });
      }
      charCursorX += chW;
    }
    const grainFadeOut = 1 - BREffectBase.clamp01((p - 0.72) / 0.28);
    if (grainFadeOut > 0.01) {
      this.drawMaskParticles(ctx, config, dpr, grains, startX, y, baseOpacity, (g) => {
        const travelWindow = 0.44;
        const localT = BREffectBase.clamp01((p - g.delayRatio) / travelWindow);
        if (localT <= 0) {
          return null;
        }
        const ease = 1 - Math.pow(1 - localT, 3.4);
        const fadeIn = Math.min(1, localT * 4);
        return {
          localT,
          ease,
          alpha: fadeIn * grainFadeOut * 0.9,
          blur: (1 - ease) * 6 + 3,
          size: g.size * (1.15 - ease * 0.3),
        };
      });
    }
    return textWidth;
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
    const textWidth = segment.totalWidth ?? ctx.measureText(segment.text).width;
    const grains = segment.grains;

    if (!grains || grains.length === 0) {
      return BREffectBase.fallbackText(ctx, segment.text, startX, y, rgbVal, baseOpacity * segment.progress);
    }
    const p = BREffectBase.clamp01(segment.progress);
    const textReveal = BREffectBase.clamp01((p - 0.45) / 0.55);

    if (textReveal > 0.01) {
      const easeText = BREffectBase.easeOutCubic(textReveal);
      BREffectBase.drawStyledText(ctx, segment.text, {
        x: startX,
        y,
        rgbVal,
        alpha: baseOpacity * easeText,
      });
    }

    const frostFadeOut = 1 - BREffectBase.clamp01((p - 0.72) / 0.28);
    if (frostFadeOut > 0.01) {
      this.drawMaskParticles(ctx, config, dpr, grains, startX, y, baseOpacity, (g) => {
        const growT = BREffectBase.clamp01((p - g.delayRatio) / 0.25);
        if (growT <= 0) {
          return null;
        }
        const flash = Math.sin(growT * Math.PI);
        const crystalSpark = 0.65 + 0.35 * Math.sin(p * g.pulseSpeed + g.phase);
        return {
          localT: 1,
          ease: 1,
          alpha: Math.min(1, growT * 2.5) * frostFadeOut * crystalSpark,
          blur: (4 + flash * 12),
          size: g.size * (0.6 + 0.4 * BREffectBase.easeOutCubic(growT) + flash * 0.4),
        };
      });
    }
    return textWidth;
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
      maxLinkDist: number = 22
  ): number {
    const textWidth = segment.totalWidth ?? ctx.measureText(segment.text).width;
    const grains = segment.grains;
    if (!grains || grains.length === 0) {
      return BREffectBase.fallbackText(ctx, segment.text, startX, y, rgbVal, baseOpacity * segment.progress);
    }
    const p = BREffectBase.clamp01(segment.progress);
    const textReveal = BREffectBase.clamp01((p - 0.55) / 0.45);

    if (textReveal > 0.01) {
      const easeText = BREffectBase.easeOutCubic(textReveal);
      BREffectBase.drawStyledText(ctx, segment.text, {
        x: startX,
        y,
        rgbVal,
        alpha: baseOpacity * easeText,
      });
    }

    const fadeOut = 1 - BREffectBase.clamp01((p - 0.75) / 0.25);

    if (fadeOut > 0.01) {
      const linePhase = BREffectBase.clamp01((p - 0.2) / 0.45);
      const links = segment.constellationLinks ?? BRMaskEffects.buildConstellationLinks(grains, maxLinkDist);

      if (linePhase > 0.01 && links.length > 0) {
        ctx.save();
        ctx.strokeStyle = config.activeTextColor;
        ctx.shadowColor = config.shadowColor;
        ctx.shadowBlur = 6 * dpr;
        ctx.lineWidth = 0.8 * dpr;
        ctx.globalAlpha = baseOpacity * linePhase * fadeOut * 0.55;
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
        const starAppear = BREffectBase.clamp01((p - g.delayRatio) / 0.22);
        if (starAppear <= 0) {
          return null;
        }
        const twinkle = 0.7 + 0.3 * Math.sin(p * g.pulseSpeed + g.phase);
        const ease = BREffectBase.easeOutCubic(starAppear);
        return {
          localT: starAppear,
          ease,
          alpha: ease * fadeOut * twinkle,
          blur: 8 + twinkle * 8,
          size: g.size * (0.85 + twinkle * 0.25),
        };
      });
    }
    return textWidth;
  }
}
