declare global {
  interface HTMLElementTagNameMap {
    'ui-icon': import('./ui/ui_icon.ts').UIIcon;
    'ui-button': import('./ui/ui_button.ts').UIButton;
    'ui-toolbar': import('./ui/ui_toolbar.ts').UIToolbar;
    'ui-overlay': import('./ui/ui_overlay.ts').UIOverlay;
    'ui-logo': import('./ui/ui_logo.ts').UILogo;
    'ui-subtitle': import('./ui/ui_subtitle.ts').UISubtitle;
    'breathe-rhythm': import('./breathe_rhythm_engine.ts').BreatheRhythmEngine;
  }
}

export {};
