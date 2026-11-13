import { UIComponent } from './ui_component.ts';

export class UIOverlay extends UIComponent {
  private showTimer: number | null = null;

  public delay: number = 0;
  public onUpdateHandler: (overlay: UIOverlay, engine: any) => boolean = () => false;

  static get observedAttributes (): string[] {
    return [...super.observedAttributes, 'delay'];
  }

  private clearShowTimer (): void {
    if (this.showTimer !== null) {
      window.clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  public disconnectedCallback (): void {
    this.clearShowTimer();
    super.disconnectedCallback();
  }

  public attributeChangedCallback (name: string, oldValue: string, newValue: string): void {
    super.attributeChangedCallback(name, oldValue, newValue);

    if (name === 'delay') {
      this.delay = Math.max(0, Number(newValue) || 0);
    }
  }

  public updateUI (): void {
    if (!this._engine) {
      return;
    }

    const shouldShow = Boolean(this.onUpdateHandler(this, this._engine));
    this.clearShowTimer();

    if (!shouldShow) {
      this.removeAttribute('visible');
      return;
    }

    const activeDelay = document.hidden ? 0 : (this.delay || Math.max(0, Number(this.getAttribute('delay')) || 0));

    if (activeDelay === 0) {
      this.setAttribute('visible', '');
    } else {
      this.showTimer = window.setTimeout(() => {
        this.showTimer = null;
        this.setAttribute('visible', '');
      }, activeDelay);
    }
  }
}

customElements.define('ui-overlay', UIOverlay);
