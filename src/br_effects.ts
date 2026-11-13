import { BRContext, BREngineConfig } from './types.ts';
import { BRParticle } from './br_particle.ts';
import { BRTags } from './br_tags.ts';
import { BREffectBase, BRRenderSegment } from './effects/br_effects_base.ts';
import { BRMaskEffects, BRTextMaskMode } from './effects/br_effects_mask.ts';
import { BRParticleEffectMode, BRParticleEffects } from './effects/br_effects_particles.ts';
import { BRSyllabicEffects } from './effects/br_effects_syllabic.ts';
import { BRSimpleEffects } from './effects/br_effects_simple.ts';

export {
  BREffectBase,
  BRRenderSegment,
  BRMaskParticle,
  BRWindGustParticle,
  BRTextSprite,
} from './effects/br_effects_base.ts';

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
    fireflies: (...args) => BRMaskEffects.drawFireflies(...args),
    sand: (...args) => BRMaskEffects.drawSand(...args),
    glitter: (...args) => BRMaskEffects.drawShimmer(...args),
    breeze: (...args) => BRMaskEffects.drawBreeze(...args),
    frost: (...args) => BRMaskEffects.drawFrost(...args),
    constellation: (...args) => BRMaskEffects.drawConstellation(...args),
    wind: (...args) => BRParticleEffects.drawWind(...args),
    embers: (...args) => BRParticleEffects.drawEmbers(...args),
    snow: (...args) => BRParticleEffects.drawSnow(...args),
    sparks: (...args) => BRParticleEffects.drawSparks(...args),
    dandelion: (...args) => BRParticleEffects.drawDandelion(...args),
    fire: (...args) => BRSyllabicEffects.drawFire(...args),
    pulse: (...args) => BRSyllabicEffects.drawPulse(...args),
    ripple: (...args) => BRSyllabicEffects.drawRipple(...args),
    echo: (...args) => BRSimpleEffects.drawEcho(...args),
    mirror: (...args) => BRSimpleEffects.drawMirror(...args),
    water: (...args) => BRSimpleEffects.drawWater(...args),
    grow: (...args) => BRSimpleEffects.drawGrow(...args),
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
      param?: string
  ): BRRenderSegment {
    const type = BRTags.getType(tag);
    const segment: BRRenderSegment = {
      text,
      tag,
      type,
      param,
      progress: 0,
      duration,
    };

    switch (type) {
      case 'mask': {
        segment.grains = BRMaskEffects.sampleTextMask(ctx, font, text, tag as BRTextMaskMode);
        break;
      }
      case 'particles': {
        if (tag === 'wind') {
          segment.gusts = BRParticleEffects.createWindGusts(ctx, font, text);
        } else {
          segment.flowParticles = BRParticleEffects.createFlowParticles(
              ctx,
              font,
              text,
              tag as Exclude<BRParticleEffectMode, 'wind'>
          );
        }
        break;
      }
      case 'syllabic':{
        segment.sprite = BREffectBase.createTextSprite(ctx, font, text);
        segment.syllables = BRTags.splitIntoSyllables(text);
        break;
      }
      case 'simple': {
        segment.sprite = BREffectBase.createTextSprite(ctx, font, text);
        break;
      }
    }

    return segment;
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

    return BREffectBase.fallbackText(ctx, segment.text, startX, y, rgbVal, baseOpacity * segment.progress);
  }

  public static triggerFlash (
      ctx: BRContext,
      centerX: number,
      centerY: number,
      spreadX: number,
      count: number = 60
  ): void {
    this._particles.push(...BRParticleEffects.createFlashParticles(ctx, centerX, centerY, spreadX, count));
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
