import { UIComponent } from './ui_component.ts';
import { brDict } from '../br_dictionary';

export class UISubtitle extends UIComponent {
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
    const raw = brDict['APP_SUBTITLE'];

    if (!raw) {
      return;
    }

    const match = raw.match(/^(\.{3})([\s\S]*?)(\.{3})$/) || ['', '', raw, ''];
    const [, leftDots, coreText, rightDots] = match;
    const [leftPart, rightPart] = this.splitCore(coreText);

    this.template = `
        <p 
        class="screen-subtitle" 
        aria-label="${ leftPart.trim() } ${ rightPart.trim() }" 
        aria-level="2" 
        role="heading">
          <span 
          class="sub-dots-left" 
          aria-hidden="true"
          >${ this.renderDots(leftDots) }</span><span 
          class="sub-half sub-left" 
          aria-hidden="true"
          >${ this.renderHalf(leftPart, false) }</span><span 
          class="sub-half sub-right" 
          aria-hidden="true"
          >${ this.renderHalf(rightPart, true) }</span><span 
          class="sub-dots-right" 
          aria-hidden="true"
          >${ this.renderDots(rightDots) }</span>
        </p>
    `;

    this.renderTemplate();
  }
}

customElements.define('ui-subtitle', UISubtitle);
