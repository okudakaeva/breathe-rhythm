import { UIComponent } from './ui_component.ts';
import { brDict } from '../br_dictionary';

export class UILogo extends UIComponent {
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

  public updateUI (): void {
    const raw = brDict['APP_TITLE'];

    if (!raw) {
      return;
    }

    const [topDots, topWord, bottomWord, bottomDots] = this.splitRows(raw);

    this.template = `
      <h1 
      class="screen-title" 
      aria-label="${ topWord.trim() } ${ bottomWord.trim() }">
        <span class="row" aria-hidden="true">
          <span class="dots-left">${ this.renderDots(topDots) }</span>${ this.renderChars(topWord) }
        </span>
        <span class="row" aria-hidden="true">
          ${ this.renderChars(bottomWord, topWord.trim().length) }<span class="dots-right">${ this.renderDots(bottomDots) }</span>
        </span>
      </h1>
    `;

    this.renderTemplate();
  }
}

customElements.define('ui-logo', UILogo);
