declare global {
  interface HTMLElementTagNameMap {
    'ui-icon': import('./ui/ui_icon.ts').UIIcon;
    'ui-button': import('./ui/ui_button.ts').UIButton;
    'breathe-rhythm': import('./breathe_rhythm_engine.ts').BreatheRhythmEngine;
  }
}

export {};
