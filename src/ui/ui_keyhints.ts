import { UIComponent } from './ui_component.ts';
import { brDict } from '../br_dictionary';

export class UIKeyHints extends UIComponent {
  private hints: Record<'space' | 'reset', { key: string, desc: string, }> = {
    space: {
      key: brDict['HINT_SPACE_KEY'],
      desc: brDict['HINT_SPACE_DESC']
    },
    reset: {
      key: brDict['HINT_RESET_KEY'],
      desc: brDict['HINT_RESET_DESC']
    }
  }

  public connectedCallback (): void {
    this.template = `
      <span><kbd>${ this.hints.space.key }</kbd> <span>${ this.hints.space.desc }</span></span>
      <span><kbd>${ this.hints.reset.key }</kbd> <span>${ this.hints.reset.desc }</span></span>
    `;

    this.renderTemplate();
    this.updateUI();
  }

  public updateUI (): void {
  }
}

customElements.define('ui-keyhints', UIKeyHints);
