declare global {
  interface HTMLElementTagNameMap {
    'ui-app': import('./ui_app.ts').UIApp;
    'ui-icon': import('./ui_icon.ts').UIIcon;
    'ui-button': import('./ui_button.ts').UIButton;
    'ui-toolbar': import('./ui_toolbar.ts').UIToolbar;
    'ui-overlay': import('./ui_overlay.ts').UIOverlay;
    'ui-logo': import('./ui_logo.ts').UILogo;
    'ui-subtitle': import('./ui_subtitle.ts').UISubtitle;
    'ui-pause': import('./ui_pause.ts').UIPause;
    'ui-play': import('./ui_play.ts').UIPlay;
    'ui-keyhints': import('./ui_keyhints.ts').UIKeyHints;
    'breathe-rhythm': import('../breathe_rhythm_engine.ts').BreatheRhythmEngine;
  }
}

export {};
