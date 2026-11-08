import { BRColor, BRContext } from './types.ts';

export class Br_particle {
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
    this.size = Math.random() * 4 + 1;
    this.speedX = (Math.random() - 0.5) * 6;
    this.speedY = (Math.random() - 0.5) * 6;
    this.alpha = 1;
    this.color = color;
    this.ctx = ctx;
  }

  update () {
    this.x += this.speedX;
    this.y += this.speedY;
    this.alpha -= 0.015;
    if (this.size > 0.2) this.size -= 0.05;
  }

  isDead(): boolean {
    return this.alpha <= 0 || this.size <= 0.2;
  }

  draw () {
    if (!this.ctx) return;

    const oldAlpha = this.ctx.globalAlpha;
    this.ctx.globalAlpha = this.alpha;
    this.ctx.fillStyle = this.color;
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = oldAlpha;
  }
}
