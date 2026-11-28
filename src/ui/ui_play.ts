import { UIComponent } from './ui_component.ts';

export class UIPlay extends UIComponent {
  public connectedCallback (): void {
    this.template = `
      <span part="wave left" aria-hidden="true"></span>
      <slot></slot>
      <span part="wave" aria-hidden="true"></span>
    `;

    this.renderTemplate(true);
    this.updateUI();
  }

  public updateUI (): void {}
}

customElements.define('ui-play', UIPlay);
