export class UIOverlay extends HTMLElement {
  private _engine: any = null;
  private changeEvent: string = '';
  private showTimer: number | null = null;
  private handleStateChange = () => this.updateUI();

  public delay: number = 0;
  public onUpdateHandler: (overlay: UIOverlay, engine: any) => boolean = () => false;

  static get observedAttributes (): string[] {
    return ['changeevent', 'delay'];
  }

  private clearShowTimer (): void {
    if (this.showTimer !== null) {
      window.clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private syncListener (remove: boolean = false): void {
    if (!this._engine || !this.changeEvent) {
      return;
    }

    if (remove) {
      this._engine.removeEventListener(this.changeEvent, this.handleStateChange);
    } else {
      this._engine.addEventListener(this.changeEvent, this.handleStateChange);
    }
  }

  public set engine (instance: any) {
    this.syncListener(true);
    this._engine = instance;
    this.syncListener(false);
    this.updateUI();
  }

  public get engine (): any {
    return this._engine;
  }

  public connectedCallback (): void {
    this.updateUI();
  }

  public disconnectedCallback (): void {
    this.clearShowTimer();
    this.syncListener(true);
  }

  public attributeChangedCallback (name: string, _oldValue: string, newValue: string): void {
    if (name === 'changeevent') {
      this.syncListener(true);
      this.changeEvent = newValue || '';
      this.syncListener(false);
      this.updateUI();
    }

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
