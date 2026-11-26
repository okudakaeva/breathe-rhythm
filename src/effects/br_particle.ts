import { BRColor, BRContext } from '../types.ts';

const PARTICLE_CONFIG = {
  SIZE_MIN: 1,
  SIZE_RANGE: 3,
  SPEED_RANGE: 6,
  INITIAL_ALPHA: 1,
  ALPHA_DECAY: 0.02,
  SIZE_DECAY: 0.985,
  DEAD_ALPHA_THRESHOLD: 0.015,
  MIN_DRAW_RADIUS: 0.15,
} as const;

export class BRParticle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  alpha: number;
  color: BRColor;
  ctx: BRContext;

  constructor (x: number, y: number, color: BRColor, ctx: BRContext) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * PARTICLE_CONFIG.SIZE_RANGE + PARTICLE_CONFIG.SIZE_MIN;
    this.speedX = (Math.random() - 0.5) * PARTICLE_CONFIG.SPEED_RANGE;
    this.speedY = (Math.random() - 0.5) * PARTICLE_CONFIG.SPEED_RANGE;
    this.alpha = PARTICLE_CONFIG.INITIAL_ALPHA;
    this.color = color;
    this.ctx = ctx;
  }

  // ============================================================================
  // ПУБЛИЧНЫЙ API
  // ============================================================================

  public update (): void {
    this.x += this.speedX;
    this.y += this.speedY;
    this.alpha = Math.max(0, this.alpha - PARTICLE_CONFIG.ALPHA_DECAY);
    this.size *= PARTICLE_CONFIG.SIZE_DECAY;
  }

  public isDead (): boolean {
    return this.alpha <= PARTICLE_CONFIG.DEAD_ALPHA_THRESHOLD;
  }

  public draw (): void {
    if (!this.ctx || this.isDead()) {
      return;
    }

    const oldAlpha = this.ctx.globalAlpha;
    this.ctx.globalAlpha = this.alpha;
    this.ctx.fillStyle = this.color;
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, Math.max(PARTICLE_CONFIG.MIN_DRAW_RADIUS, this.size), 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = oldAlpha;
  }
}
