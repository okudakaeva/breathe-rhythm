import { UIComponent } from './ui_component.ts';

export class UILogo extends UIComponent {
  static get observedAttributes (): string[] {
    return [...super.observedAttributes, 'label'];
  }

  private splitRows = (str: string): [string, string, string, string] => {
    const [topRaw = '', bottomRaw = ''] = str.split('\n');

    return [topRaw.slice(0, 3), topRaw.slice(3), bottomRaw.slice(0, -3), bottomRaw.slice(-3)];
  }

  private renderChars = (str: string, offset: number = 0) =>
      Array.from(str)
          .map((ch, i) => `<span class="char" style="--i: ${ offset + i }">${ ch }</span>`)
          .join('');

  public renderDots = (str: string) =>
      Array.from(str)
          .map((ch, i) => `<span class="dot" style="--d: ${ i }">${ ch }</span>`)
          .join('');

  public attributeChangedCallback (name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue || '', newValue || '');

    if (name === 'label' && oldValue !== newValue) {
      this.updateUI();
    }
  }

  public updateUI (): void {
    const raw = this.getAttribute('label') || '';

    if (!raw) {
      return;
    }

    const [topDots, topWord, bottomWord, bottomDots] = this.splitRows(raw);

    this.template = `
      <div class="logo" role="heading" aria-level="1">
        <span class="row">
          <span class="dots-left">${ this.renderDots(topDots) }</span>${ this.renderChars(topWord) }
        </span>
        <span class="row">
          ${ this.renderChars(bottomWord, topWord.trim().length) }<span class="dots-right">${ this.renderDots(bottomDots) }</span>
        </span>
      </div>
    `;

    this.renderTemplate();
  }
}

customElements.define('ui-logo', UILogo);
