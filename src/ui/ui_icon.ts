const ICON_REGISTRY = {
  none: '',
  play: `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
  reset: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`,
  loader: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10" stroke-dasharray="40 20"/></svg>`,
} as const satisfies Record<string, string>;

export type UIIconName = keyof typeof ICON_REGISTRY;

const DEFAULT_ICON: UIIconName = 'none';

export class UIIcon extends HTMLElement {
  public name: UIIconName = DEFAULT_ICON;

  static get observedAttributes (): string[] {
    return ['name'];
  }

  private resolveIconName (value: string | null): UIIconName {
    return value !== null && value in ICON_REGISTRY ? (value as UIIconName) : DEFAULT_ICON;
  }

  private render (): void {
    this.name = this.resolveIconName(this.getAttribute('name'));
    this.innerHTML = ICON_REGISTRY[this.name];
  }

  public connectedCallback (): void {
    this.render();
  }

  public attributeChangedCallback (name: string, oldValue: string | null, newValue: string | null): void {
    if (name === 'name' && oldValue !== newValue) {
      this.render();
    }
  }
}

customElements.define('ui-icon', UIIcon);
