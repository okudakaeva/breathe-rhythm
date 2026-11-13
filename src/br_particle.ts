import { BRColor, BRContext } from './types.ts';

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
    this.size = Math.random() * 3 + 1;
    this.speedX = (Math.random() - 0.5) * 6;
    this.speedY = (Math.random() - 0.5) * 6;
    this.alpha = 1;
    this.color = color;
    this.ctx = ctx;
  }

  // ============================================================================
  // ПУБЛИЧНЫЙ API
  // ============================================================================

  public update (): void {
    this.x += this.speedX;
    this.y += this.speedY;
    this.alpha = Math.max(0, this.alpha - 0.02);
    this.size *= 0.985;
  }

  public isDead (): boolean {
    return this.alpha <= 0.015;
  }

  public draw (): void {
    if (!this.ctx || this.isDead()) {
      return;
    }

    const oldAlpha = this.ctx.globalAlpha;
    this.ctx.globalAlpha = this.alpha;
    this.ctx.fillStyle = this.color;
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, Math.max(0.15, this.size), 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = oldAlpha;
  }
}
