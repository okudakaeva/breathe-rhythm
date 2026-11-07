export class UIButton extends HTMLElement {
  private button!: HTMLButtonElement;
  private _engine: any = null;
  private changeEvent: string = '';
  private handleStateChange = () => this.updateUI();
  public onClickHandler: (button: HTMLButtonElement, engine: any) => void | Promise<void> = () => undefined;
  public onUpdateHandler: (button: HTMLButtonElement, engine: any) => void = () => undefined;

  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
  }

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
    if (!this.button) {
      this.render();
    }
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

  private render (): void {
    const slot = document.createElement('slot');
    slot.setAttribute('name', 'icon');

    this.button = document.createElement('button');
    this.button.appendChild(slot);

    this.button.addEventListener('click', async () => {
      await this.onClickHandler(this.button, this._engine);
    });

    this.button.setAttribute('part', 'ui-button');
    this.shadowRoot!.appendChild(this.button);
  }

  public updateUI (): void {
    if (!this.button) {
      return;
    }
    this.onUpdateHandler(this.button, this._engine);
  }
}

customElements.define('ui-button', UIButton);
