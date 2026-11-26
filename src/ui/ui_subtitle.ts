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

  public updateUI (): void {
    const raw = this.getAttribute('label') || '';

    if (!raw) {
      return;
    }

    const match = raw.match(/^(\.{3})([\s\S]*?)(\.{3})$/) || ['','',raw,''];

    const [, leftDots, coreText, rightDots] = match;

    console.log(raw, match, leftDots, coreText, rightDots)

    this.template = `
        <p class="subtitle" data-dict="APP_SUBTITLE">
          <span class="sub-dots-left">${ leftDots }</span><span class="sub-text">${ coreText }</span><span class="sub-dots-right">${ rightDots }</span>
        </p>
    `;

    this.renderTemplate();
  }
}

customElements.define('ui-subtitle', UISubtitle);
