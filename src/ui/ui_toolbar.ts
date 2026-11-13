import { UIComponent } from './ui_component.ts';

export class UIToolbar extends UIComponent {
  public onUpdateHandler: (toolbar: UIToolbar, engine: any) => void = () => undefined;

  public updateUI (): void {
    if (!this._engine) {
      return;
    }
    this.onUpdateHandler(this, this._engine);
  }
}

customElements.define('ui-toolbar', UIToolbar);
