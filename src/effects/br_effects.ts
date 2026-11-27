import { BRContext, BREngineConfig } from '../types.ts';
import { BRParticle } from './br_particle.ts';
import { BRTags } from '../br_tags.ts';
import { BRAccentsBase, BRRenderSegment } from './br_accents_base.ts';
import { BRAccentsMask, BRTextMaskMode } from './br_accents_mask.ts';
import { BRParticleEffectMode, BRAccentsParticle } from './br_accents_particles.ts';
import { BRAccentsSyllabic } from './br_accents_syllabic.ts';
import { BRAccentsSimple } from './br_accents_simple.ts';

export {
  BRAccentsBase,
  BRRenderSegment,
  BRMaskParticle,
  BRWindGustParticle,
  BRTextSprite,
} from './br_accents_base.ts';

type BRSegmentDrawer = (
    ctx: BRContext,
    config: BREngineConfig,
    dpr: number,
    segment: BRRenderSegment,
    startX: number,
    y: number,
    rgbVal: number,
    baseOpacity: number
) => number;

export class BREffects {
  private static _particles: BRParticle[] = [];

  private static readonly drawers: Record<string, BRSegmentDrawer> = {
    fireflies: (...args) => BRAccentsMask.drawFireflies(...args),
    sand: (...args) => BRAccentsMask.drawSand(...args),
    glitter: (...args) => BRAccentsMask.drawShimmer(...args),
    breeze: (...args) => BRAccentsMask.drawBreeze(...args),
    frost: (...args) => BRAccentsMask.drawFrost(...args),
    constellation: (...args) => BRAccentsMask.drawConstellation(...args),
    wind: (...args) => BRAccentsParticle.drawWind(...args),
    embers: (...args) => BRAccentsParticle.drawEmbers(...args),
    snow: (...args) => BRAccentsParticle.drawSnow(...args),
    sparks: (...args) => BRAccentsParticle.drawSparks(...args),
    dandelion: (...args) => BRAccentsParticle.drawDandelion(...args),
    echo: (...args) => BRAccentsSimple.drawEcho(...args),
    mirror: (...args) => BRAccentsSimple.drawMirror(...args),
    water: (...args) => BRAccentsSimple.drawWater(...args),
    grow: (...args) => BRAccentsSimple.drawGrow(...args),
    fire: (...args) => BRAccentsSyllabic.drawFire(...args),
    pulse: (...args) => BRAccentsSyllabic.drawPulse(...args),
    ripple: (...args) => BRAccentsSyllabic.drawRipple(...args),
    sparkle: (...args) => BRAccentsSyllabic.drawSparkle(...args),
    orbit: (...args) => BRAccentsSyllabic.drawOrbit(...args),
  };

  // ============================================================================
  // ПУБЛИЧНЫЙ API
  // ============================================================================

  public static get hasParticles (): boolean {
    return this._particles.length > 0;
  }

  public static reset (): void {
    this._particles = [];
  }

  public static createSegment (
      ctx: BRContext,
      font: string,
      tag: string,
      text: string,
      duration: number,
      param?: string,
      activeColor: string = '#ffffff'
  ): BRRenderSegment {
    ctx.font = font;
    const type = BRTags.getType(tag);
    const chars = Array.from(text);
    const charWidths = chars.map(ch => ctx.measureText(ch).width);
    const totalWidth = ctx.measureText(text).width;

    const segment: BRRenderSegment = {
      text,
      tag,
      type,
      param,
      progress: 0,
      duration,
      totalWidth,
      charWidths,
    };

    switch (type) {
      case 'mask': {
        segment.grains = BRAccentsMask.sampleTextMask(ctx, font, text, tag as BRTextMaskMode);
        if (tag === 'constellation' && segment.grains.length > 0) {
          segment.constellationLinks = BRAccentsMask.buildConstellationLinks(segment.grains);
        }
        break;
      }
      case 'particles': {
        if (tag === 'wind') {
          segment.gusts = BRAccentsParticle.createWindGusts(ctx, font, text);
        } else {
          segment.flowParticles = BRAccentsParticle.createFlowParticles(
              ctx,
              font,
              segment,
              tag as Exclude<BRParticleEffectMode, 'wind'>
          );
        }
        break;
      }
      case 'syllabic': {
        segment.sprite = BRAccentsBase.createTextSprite(ctx, font, text, activeColor);
        const syllables = BRTags.splitIntoSyllables(text);
        segment.syllables = syllables;
        segment.syllableWidths = syllables.map(s => ctx.measureText(s).width);
        break;
      }
      case 'simple': {
        segment.sprite = BRAccentsBase.createTextSprite(ctx, font, text, activeColor);
        break;
      }
    }

    return segment;
  }

  public static disposeSegment (segment: BRRenderSegment): void {
    if (segment.sprite) {
      BRAccentsBase.disposeTextSprite(segment.sprite);
      segment.sprite = undefined;
    }

    segment.grains = undefined;
    segment.constellationLinks = undefined;
    segment.gusts = undefined;
    segment.flowParticles = undefined;
    segment.syllables = undefined;
    segment.charWidths = undefined;
    segment.syllableWidths = undefined;
  }

  public static drawSegment (
      ctx: BRContext,
      config: BREngineConfig,
      dpr: number,
      segment: BRRenderSegment,
      startX: number,
      y: number,
      rgbVal: number,
      baseOpacity: number
  ): number {
    const drawer = segment.tag ? this.drawers[segment.tag] : undefined;
    if (drawer) {
      return drawer(ctx, config, dpr, segment, startX, y, rgbVal, baseOpacity);
    }

    return BRAccentsBase.fallbackText(ctx, segment.text, startX, y, rgbVal, baseOpacity * segment.progress);
  }

  public static triggerFlash (
      ctx: BRContext,
      centerX: number,
      centerY: number,
      spreadX: number,
      count: number = 60
  ): void {
    this._particles.push(...BRAccentsParticle.createFlashParticles(ctx, centerX, centerY, spreadX, count));
  }

  public static drawParticles (ctx: BRContext): void {
    if (this._particles.length === 0) {
      return;
    }

    ctx.save();
    this._particles = this._particles.filter(p => {
      p.update();
      p.draw();
      return !p.isDead();
    });
    ctx.restore();
  }
}
