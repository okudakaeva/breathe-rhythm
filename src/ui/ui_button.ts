import { UIComponent } from './ui_component.ts';

export class UIButton extends UIComponent {
  private button!: HTMLButtonElement;

  public label: string = '';
  public disabled: boolean = false;
  public onClickHandler: (button: HTMLButtonElement, engine: any) => void | Promise<void> = () => undefined;
  public onUpdateHandler: (button: HTMLButtonElement, engine: any) => void = () => undefined;

  constructor () {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes (): string[] {
    return [...super.observedAttributes, 'label', 'disabled'];
  }

  public connectedCallback (): void {
    if (!this.button) {
      this.render();
    }
    super.connectedCallback();
  }

  public attributeChangedCallback (name: string, oldValue: string, newValue: string): void {
    super.attributeChangedCallback(name, oldValue, newValue);

    if (name === 'label') {
      this.label = newValue || '';

      if (this.button) {
        this.button.setAttribute('aria-label', this.label);
      }
    }

    if (name === 'disabled') {
      this.disabled = newValue !== null && newValue !== 'false';

      if (this.button) {
        this.button.disabled = this.disabled;
      }
    }
  }

  private render (): void {
    const slot = document.createElement('slot');
    slot.setAttribute('name', 'icon');

    this.button = document.createElement('button');
    this.button.setAttribute('aria-label', this.label || this.getAttribute('label') || '');
    this.button.disabled = this.disabled || this.hasAttribute('disabled');
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
