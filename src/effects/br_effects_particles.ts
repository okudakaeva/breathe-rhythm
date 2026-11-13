import { BRContext, BREngineConfig } from '../types.ts';
import { BRParticle } from '../br_particle.ts';
import {
  BREffectBase,
  BRFlowParticle,
  BRRenderSegment,
  BRWindGustParticle,
} from './br_effects_base.ts';

export type BRParticleEffectMode = 'wind' | 'embers' | 'snow' | 'sparks' | 'dandelion';
export class BRParticleEffects {

  // ============================================================================
  // ПУБЛИЧНЫЙ API
  // ============================================================================

  public static createFlashParticles (
      ctx: BRContext,
      centerX: number,
      centerY: number,
      spreadX: number,
      count: number = 60,
      color: string = '#ffffff'
  ): BRParticle[] {
    const created: BRParticle[] = [];
    for (let i = 0; i < count; i++) {
      created.push(
          new BRParticle(
              centerX + (Math.random() - 0.5) * spreadX,
              centerY + (Math.random() - 0.5) * 20,
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
      wavesCount: number = 3
  ): BRWindGustParticle[] {
    ctx.font = font;
    const textWidth = Math.max(40, Math.ceil(ctx.measureText(text).width));
    const fontSize = BREffectBase.extractFontSize(font);
    const gusts: BRWindGustParticle[] = [];
    const count = Math.min(180, Math.max(65, Math.round(textWidth * 0.45)));

    for (let i = 0; i < count; i++) {
      const waveIndex = i % Math.max(1, wavesCount);
      gusts.push({
        startX: -60 - Math.random() * 140,
        endX: textWidth + 50 + Math.random() * 110,
        baseY: -fontSize * 0.35 + (Math.random() - 0.5) * (fontSize * 1.15),
        size: Math.random() * 0.9 + 0.35,
        waveAmp: 3 + Math.random() * 7,
        waveFreq: (1.5 + Math.random() * 2) * Math.PI,
        phase: Math.random() * Math.PI * 2,
        delayRatio: waveIndex * 0.14 + Math.random() * 0.16,
        speedMulti: 0.85 + Math.random() * 0.35,
        alphaMax: 0.35 + Math.random() * 0.45,
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
    const chars = Array.from(segment.text);
    const totalChars = Math.max(1, chars.length);
    const fontSize = BREffectBase.extractFontSize(font);
    const list: BRFlowParticle[] = [];

    let cursorX = 0;
    for (let c = 0; c < chars.length; c++) {
      const ch = chars[c];
      const chW = segment.charWidths?.[c] ?? ctx.measureText(ch).width;
      const charProgressRatio = totalChars > 1 ? c / totalChars : 0;

      if (ch.trim().length > 0) {
        const perChar = mode === 'sparks' ? 4 : mode === 'embers' ? 3 : 2;

        for (let k = 0; k < perChar; k++) {
          const rx = cursorX + Math.random() * chW;
          const ry = -Math.random() * fontSize * 0.7;

          if (mode === 'embers') {
            list.push({
              x: rx,
              y: ry,
              vx: (Math.random() - 0.35) * 22,
              vy: -(28 + Math.random() * 44),
              size: Math.random() * 1.3 + 0.7,
              waveAmp: 3 + Math.random() * 6,
              waveFreq: (1.5 + Math.random() * 2) * Math.PI,
              phase: Math.random() * Math.PI * 2,
              delayRatio: charProgressRatio * 0.6 + Math.random() * 0.08,
              lifeWindow: 0.38,
              alphaMax: 0.65 + Math.random() * 0.35,
            });
          } else if (mode === 'snow') {
            list.push({
              x: rx + (Math.random() - 0.5) * 18,
              y: -fontSize * 1.4 - Math.random() * 24,
              vx: (Math.random() - 0.4) * 16,
              vy: 34 + Math.random() * 32,
              size: Math.random() * 1.5 + 0.8,
              waveAmp: 4 + Math.random() * 7,
              waveFreq: (1.2 + Math.random() * 1.4) * Math.PI,
              phase: Math.random() * Math.PI * 2,
              delayRatio: charProgressRatio * 0.52 + Math.random() * 0.12,
              lifeWindow: 0.44,
              alphaMax: 0.55 + Math.random() * 0.35,
            });
          } else if (mode === 'sparks') {
            const angle = Math.random() * Math.PI * 2;
            const speed = 26 + Math.random() * 42;
            list.push({
              x: cursorX + chW * 0.5 + (Math.random() - 0.5) * chW * 0.6,
              y: -fontSize * 0.35 + (Math.random() - 0.5) * fontSize * 0.5,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: Math.random() * 1.1 + 0.6,
              waveAmp: 0,
              waveFreq: 0,
              phase: 0,
              delayRatio: charProgressRatio * 0.65 + Math.random() * 0.04,
              lifeWindow: 0.24,
              alphaMax: 0.85 + Math.random() * 0.15,
            });
          } else {
            list.push({
              x: rx,
              y: ry,
              vx: 36 + Math.random() * 58,
              vy: -(14 + Math.random() * 34),
              size: Math.random() * 1.3 + 0.6,
              waveAmp: 4 + Math.random() * 8,
              waveFreq: (1.0 + Math.random() * 1.5) * Math.PI,
              phase: Math.random() * Math.PI * 2,
              delayRatio: 0.38 + charProgressRatio * 0.25 + Math.random() * 0.08,
              lifeWindow: 0.42,
              alphaMax: 0.5 + Math.random() * 0.4,
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
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number,
      skewStrength: number = 0.28,
      driftDistance: number = 22
  ): number {
    const chars = Array.from(segment.text);
    const total = Math.max(1, chars.length);
    const textWidth = BREffectBase.getSegmentWidth(ctx, segment);

    if (segment.gusts && segment.gusts.length > 0) {
      ctx.save();
      ctx.fillStyle = config.activeTextColor;
      ctx.shadowColor = config.shadowColor;
      ctx.shadowBlur = 4 * dpr;

      for (let i = 0; i < segment.gusts.length; i++) {
        const g = segment.gusts[i];
        const localT = ((segment.progress - g.delayRatio) * g.speedMulti) / 0.65;
        if (localT <= 0 || localT >= 1) {
          continue;
        }

        const ease = 1 - Math.pow(1 - localT, 2.2);
        const curX = startX + g.startX + (g.endX - g.startX) * ease;
        const curY = y + g.baseY + Math.sin(localT * g.waveFreq + g.phase) * g.waveAmp;

        ctx.globalAlpha = baseOpacity * g.alphaMax * Math.sin(localT * Math.PI);
        ctx.beginPath();
        ctx.ellipse(curX, curY, g.size * 2.2, g.size * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    let cursorX = startX;
    for (let idx = 0; idx < chars.length; idx++) {
      const ch = chars[idx];
      const charWidth = segment.charWidths?.[idx] ?? ctx.measureText(ch).width;
      const startThreshold = (idx / total) * 0.35 + 0.12;
      const t = BREffectBase.clamp01((segment.progress - startThreshold) / (0.88 - startThreshold * 0.5));
      const ease = BREffectBase.easeOutCubic(t);

      if (ease > 0.005) {
        const offsetX = (1 - ease) * -driftDistance;
        const offsetY = Math.sin((1 - ease) * Math.PI) * -3 * (1 - ease);
        const skew = (1 - ease) * skewStrength;

        ctx.save();
        ctx.translate(cursorX + offsetX, y + offsetY);
        ctx.transform(1, 0, skew, 1, 0, 0);
        BREffectBase.drawStyledText(ctx, ch, {
          x: 0,
          y: 0,
          rgbVal,
          alpha: baseOpacity * ease,
          shadowColor: config.shadowColor,
          shadowBlur: (1 - ease) * 16 * dpr,
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
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number
  ): number {
    const textWidth = BREffectBase.getSegmentWidth(ctx, segment);
    const p = BREffectBase.clamp01(segment.progress);

    BREffectBase.drawCharReveal(ctx, config, dpr, segment, startX, y, rgbVal, baseOpacity, p, {
      spreadRatio: 0.6,
      revealDur: 0.25,
      glowBlur: 18,
    });

    const particles = segment.flowParticles;
    if (particles && particles.length > 0) {
      ctx.save();
      ctx.fillStyle = config.activeTextColor;
      ctx.shadowColor = config.shadowColor;
      ctx.shadowBlur = 10 * dpr;

      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        const localT = (p - pt.delayRatio) / pt.lifeWindow;
        if (localT <= 0 || localT >= 1) {
          continue;
        }

        const ease = BREffectBase.easeOutQuad(localT);
        const swayX = Math.sin(localT * pt.waveFreq + pt.phase) * pt.waveAmp;
        const curX = startX + pt.x + pt.vx * ease + swayX;
        const curY = y + pt.y + pt.vy * ease;
        const flicker = 0.7 + 0.3 * Math.sin(p * 24 + pt.phase);
        ctx.globalAlpha = baseOpacity * pt.alphaMax * Math.sin(localT * Math.PI) * flicker;
        ctx.beginPath();
        ctx.arc(curX, curY, pt.size * (1 - localT * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    return textWidth;
  }

  public static drawSnow (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number
  ): number {
    const textWidth = BREffectBase.getSegmentWidth(ctx, segment);
    const p = BREffectBase.clamp01(segment.progress);
    const particles = segment.flowParticles;

    BREffectBase.drawCharReveal(ctx, config, dpr, segment, startX, y, rgbVal, baseOpacity, p, {
      spreadRatio: 0.55,
      revealDur: 0.32,
      glowBlur: 12,
    });

    if (particles && particles.length > 0) {
      ctx.save();
      ctx.fillStyle = config.activeTextColor;
      ctx.shadowColor = config.shadowColor;
      ctx.shadowBlur = 6 * dpr;

      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        const localT = (p - pt.delayRatio) / pt.lifeWindow;
        if (localT <= 0 || localT >= 1) {
          continue;
        }
        const swayX = Math.sin(localT * pt.waveFreq + pt.phase) * pt.waveAmp;
        const curX = startX + pt.x + pt.vx * localT + swayX;
        const curY = y + pt.y + pt.vy * localT;
        ctx.globalAlpha = baseOpacity * pt.alphaMax * Math.sin(localT * Math.PI);
        ctx.beginPath();
        ctx.arc(curX, curY, pt.size, 0, Math.PI * 2);
        ctx.fill();
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
    const textWidth = BREffectBase.getSegmentWidth(ctx, segment);
    const p = BREffectBase.clamp01(segment.progress);
    const particles = segment.flowParticles;

    BREffectBase.drawCharReveal(ctx, config, dpr, segment, startX, y, rgbVal, baseOpacity, p, {
      spreadRatio: 0.65,
      revealDur: 0.18,
      glowBlur: 20,
    });

    if (particles && particles.length > 0) {
      ctx.save();
      ctx.strokeStyle = config.activeTextColor;
      ctx.fillStyle = config.activeTextColor;
      ctx.shadowColor = config.shadowColor;
      ctx.shadowBlur = 8 * dpr;
      ctx.lineWidth = 1.1 * dpr;

      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        const localT = (p - pt.delayRatio) / pt.lifeWindow;
        if (localT <= 0 || localT >= 1) {
          continue;
        }
        const ease = BREffectBase.easeOutCubic(localT);
        const tailEase = BREffectBase.easeOutCubic(Math.max(0, localT - 0.18));
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
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number
  ): number {
    const textWidth = BREffectBase.getSegmentWidth(ctx, segment);
    const p = BREffectBase.clamp01(segment.progress);
    BREffectBase.drawCharReveal(ctx, config, dpr, segment, startX, y, rgbVal, baseOpacity, p, {
      spreadRatio: 0.4,
      revealDur: 0.22,
      glowBlur: 12,
    });
    const particles = segment.flowParticles;

    if (particles && particles.length > 0) {
      ctx.save();
      ctx.fillStyle = config.activeTextColor;
      ctx.shadowColor = config.shadowColor;
      ctx.shadowBlur = 7 * dpr;

      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        const localT = (p - pt.delayRatio) / pt.lifeWindow;
        if (localT <= 0 || localT >= 1) {
          continue;
        }
        const ease = BREffectBase.easeOutQuad(localT);
        const swayY = Math.sin(localT * pt.waveFreq + pt.phase) * pt.waveAmp;
        const curX = startX + pt.x + pt.vx * ease;
        const curY = y + pt.y + pt.vy * ease + swayY;
        ctx.globalAlpha = baseOpacity * pt.alphaMax * Math.sin(localT * Math.PI);
        ctx.beginPath();
        ctx.arc(curX, curY, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    return textWidth;
  }
}
