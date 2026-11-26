export abstract class UIComponent extends HTMLElement {
  protected _engine: any = null;
  protected changeEvent: string = '';
  protected template: string = '';

  private handleStateChange = (e: Event) => {
    const detail = e instanceof CustomEvent ? e.detail : undefined;
    this.updateUI(detail);
  };

  static get observedAttributes (): string[] {
    return ['changeevent'];
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

  protected renderTemplate (useShadow: boolean = false): void {
    if (!this.template) {
      return;
    }

    if (useShadow) {
      const root = this.shadowRoot || this.attachShadow({ mode: 'open' });
      root.innerHTML = this.template;
    } else {
      this.innerHTML = this.template;
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
    this.renderTemplate();
    this.updateUI();
  }

  public disconnectedCallback (): void {
    this.syncListener(true);
  }

  public attributeChangedCallback (name: string, _oldValue: string, newValue: string): void {
    if (name === 'changeevent') {
      this.syncListener(true);
      this.changeEvent = newValue || '';
      this.syncListener(false);
      this.updateUI();
    }
  }

  public abstract updateUI (detail?: any): void;
}
