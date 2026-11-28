import { UIComponent } from './ui_component.ts';
import { brDict } from '../br_dictionary';

export class UIPause extends UIComponent {
  private splitRow = (str: string = ''): [string, string, string] => {
    return [str.slice(0, 3), str.slice(3, -3), str.slice(-3)];
  }

  public updateUI (): void {
    const titleRaw = brDict['PAUSE_TITLE'];
    const subtitleRaw = brDict['APP_SUBTITLE'];

    const [titleLeftDots, title, titleRightDots] = this.splitRow(titleRaw);
    const [subtitleLeftDots, subtitle, subtitleRightDots] = this.splitRow(subtitleRaw);

    this.template = `
        <h2 class="screen-title" aria-label="${ title.trim() }">
            <span aria-hidden="true">${ titleLeftDots }${ title }${ titleRightDots }</span>
        </h2>
        <p 
        class="screen-subtitle"
        aria-level="3" 
        role="heading"
        aria-label="${ subtitle.trim() }">
            <span aria-hidden="true">${ subtitleLeftDots }${ subtitle }${ subtitleRightDots }</span>
        </p>
    `;

    this.renderTemplate();
  }
}

customElements.define('ui-pause', UIPause);
