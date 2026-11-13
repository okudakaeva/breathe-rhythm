export class UIToolbar extends HTMLElement {
  private _engine: any = null;
  private changeEvent: string = '';
  private handleStateChange = () => this.updateUI();

  public onUpdateHandler: (toolbar: HTMLElement, engine: any) => void = () => undefined;

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

  public updateUI (): void {
    this.onUpdateHandler(this, this._engine);
  }
}

customElements.define('ui-toolbar', UIToolbar);
