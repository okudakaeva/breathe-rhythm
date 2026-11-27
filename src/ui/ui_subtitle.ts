import { UIComponent } from './ui_component.ts';

export class UISubtitle extends UIComponent {
  static get observedAttributes (): string[] {
    return [...super.observedAttributes, 'label'];
  }

  public attributeChangedCallback (name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue || '', newValue || '');

    if (name === 'label' && oldValue !== newValue) {
      this.updateUI();
    }
  }

  private renderDots (dots: string): string {
    return dots.split('').map(d => `<span class="dot">${d}</span>`).join('');
  }

  private splitCore (text: string): [string, string] {
    const mid = Math.floor(text.length / 2);
    const spaceAfter = text.indexOf(' ', mid);
    const spaceBefore = text.lastIndexOf(' ', mid);
    const splitIdx = spaceAfter !== -1 && (spaceBefore === -1 || spaceAfter - mid <= mid - spaceBefore)
        ? spaceAfter
        : spaceBefore;

    if (splitIdx === -1) {
      return [text.slice(0, mid), text.slice(mid)];
    }

    return [text.slice(0, splitIdx), text.slice(splitIdx)];
  }

  private renderHalf (text: string, fromCenter: boolean): string {
    const chars = Array.from(text);
    const len = chars.length;

    return chars.map((ch, idx) => {
      const distIndex = fromCenter ? idx : (len - 1 - idx);
      const safeChar = ch === ' ' ? '\u00A0' : ch;
      return `<span class="char" style="--d: ${distIndex}">${safeChar}</span>`;
    }).join('');
  }

  public updateUI (): void {
    const raw = this.getAttribute('label') || '';

    if (!raw) {
      return;
    }

    const match = raw.match(/^(\.{3})([\s\S]*?)(\.{3})$/) || ['', '', raw, ''];
    const [, leftDots, coreText, rightDots] = match;
    const [leftPart, rightPart] = this.splitCore(coreText);

    this.template = `
        <p class="subtitle">
          <span class="sub-dots-left">${this.renderDots(leftDots)}</span><span class="sub-half sub-left">${this.renderHalf(leftPart, false)}</span><span class="sub-half sub-right">${this.renderHalf(rightPart, true)}</span><span class="sub-dots-right">${this.renderDots(rightDots)}</span>
        </p>
    `;

    this.renderTemplate();
  }
}

customElements.define('ui-subtitle', UISubtitle);
