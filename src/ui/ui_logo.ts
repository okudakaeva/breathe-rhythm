import { UIComponent } from './ui_component.ts';

export class UILogo extends UIComponent {
  static get observedAttributes (): string[] {
    return [...super.observedAttributes, 'label'];
  }

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

    const [topRaw = '', bottomRaw = ''] = raw.split('\n');
    const topDots = topRaw.slice(0, 3);
    const topWord = topRaw.slice(3);
    const bottomWord = bottomRaw.slice(0, -3);
    const bottomDots = bottomRaw.slice(-3);

    const buildChars = (str: string, offset: number = 0) =>
        Array.from(str)
            .map((ch, i) => `<span class="char" style="--i: ${ offset + i }">${ ch }</span>`)
            .join('');

    const buildDots = (str: string) =>
        Array.from(str)
            .map((ch, i) => `<span class="dot" style="--d: ${ i }">${ ch }</span>`)
            .join('');


    this.template = `
      <div class="logo" role="heading" aria-level="1">
        <span class="row">
          <span class="dots-left">${ buildDots(topDots) }</span>${ buildChars(topWord) }
        </span>
        <span class="row">
          ${ buildChars(bottomWord, topWord.trim().length) }<span class="dots-right">${ buildDots(bottomDots) }</span>
        </span>
      </div>
    `;

    this.renderTemplate();
  }
}

customElements.define('ui-logo', UILogo);
