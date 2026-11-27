import { brDict, BRDictionary } from '../br_dictionary.ts';
import { BreatheRhythmEngine } from '../breathe_rhythm_engine.ts';
import { delay } from '../br_delay.ts';
import { UIButton, UIIconName, UIOverlay, UIToolbar } from './index.ts';

export class UIApp extends HTMLElement {
  private isIntroDone = false;
  private abortController: AbortController | null = new AbortController();
  private engine!: BreatheRhythmEngine;
  private controls!: UIToolbar;
  private startOverlay!: UIOverlay;
  private pauseOverlay!: UIOverlay;
  private btnIntro!: UIButton;
  private btnStart!: UIButton;
  private btnReset!: UIButton;
  private btnResume!: UIButton;

  private getByDictId<T extends Element>(key: keyof BRDictionary): T {
    return this.querySelector<T>(`#${brDict[key]}`)!;
  }

  private setButtonIcon = (cmp: UIButton, iconName: UIIconName): void => {
    const icon = cmp.querySelector('ui-icon');
    if (icon) {
      icon.setAttribute('name', iconName);
    }
  };

  private startAction = async (_btn: HTMLButtonElement, inst: BreatheRhythmEngine): Promise<void> => {
    if (inst?.isReady) {
      await inst.start();
      this.isIntroDone = true;
    }
  };

  private resetAction = (_btn: HTMLButtonElement, inst: BreatheRhythmEngine): void => inst?.init();

  private syncReadyState = (button: HTMLButtonElement, instance: BreatheRhythmEngine): void => {
    button.disabled = !instance || !instance.isReady;
  };

  private runOnVisibleTab = async (): Promise<void> => {
    if (document.hidden) {
      return new Promise<void>(resolve => document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          resolve();
        }
      }, { once: true }));
    }
    return Promise.resolve();
  };

  private playIntro = async (overlay: UIOverlay): Promise<void> => {
    await this.runOnVisibleTab();
    await delay(brDict['INTRO_START_DELAY']);

    this.btnIntro.addEventListener('animationend', () => {
      this.isIntroDone = true;
    }, { once: true });

    overlay.classList.add('intro-done');
    overlay.setAttribute('visible', '');
  }

  public connectedCallback (): void {
    this.engine = this.getByDictId('ID_ENGINE')!;
    this.controls = this.getByDictId('ID_TOOLBAR')!;
    this.startOverlay = this.getByDictId('ID_START_OVERLAY')!;
    this.pauseOverlay = this.getByDictId('ID_PAUSE_OVERLAY')!;
    this.btnIntro = this.getByDictId('ID_BTN_INTRO')!;
    this.btnStart = this.getByDictId('ID_BTN_START')!;
    this.btnReset = this.getByDictId('ID_BTN_RESET')!;
    this.btnResume = this.getByDictId('ID_BTN_RESUME')!;

    this.controls.onUpdateHandler = (_toolbar: HTMLElement, instance: BreatheRhythmEngine) => {
      const isVisible = Boolean(instance && (instance.isRunning || instance.isFinished));
      _toolbar.toggleAttribute('hidden', !isVisible);
    };

    this.startOverlay.onUpdateHandler = (_overlay: UIOverlay, instance: BreatheRhythmEngine) => {
      const shouldShow = Boolean(instance && !instance.isRunning && !instance.isPaused && !instance.isFinished);

      if (!shouldShow) {
        return false;
      }

      if (this.isIntroDone) {
        _overlay.classList.remove('intro-done');
        _overlay.delay = brDict['INTRO_START_DELAY'];
        return true;
      }

      if (!_overlay.classList.contains('intro-done')) {
        void this.playIntro(_overlay);
      }

      return _overlay.classList.contains('intro-done');
    };

    this.pauseOverlay.onUpdateHandler = (_overlay: UIOverlay, instance: BreatheRhythmEngine, detail?: { reason?: string }) => {
      const isPaused = Boolean(instance && instance.isPaused);
      const isInstant = isPaused && (detail?.reason === 'resize' || detail?.reason === 'hidden');

      _overlay.toggleAttribute('instant', isInstant);
      _overlay.delay = isInstant ? 0 : 350;

      return isPaused;
    };

    this.btnIntro.onClickHandler = this.startAction;
    this.btnIntro.onUpdateHandler = (_button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
      this.setButtonIcon(this.btnIntro, !instance || !instance.isReady ? 'loader' : 'play');
      _button.disabled = !instance || !instance.isReady;
    };

    this.btnResume.onClickHandler = this.startAction;
    this.btnResume.onUpdateHandler = this.syncReadyState;

    this.btnStart.onClickHandler = async (_button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
      if (!instance) {
        return;
      }

      if (instance.isRunning) {
        instance.pause();
      } else {
        await instance.start();
      }
    };

    this.btnStart.onUpdateHandler = (_button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
      if (!instance || !instance.isReady) {
        this.setButtonIcon(this.btnStart, 'loader');
        this.btnStart.setAttribute('label', brDict['BTN_LOADING']);
        _button.disabled = true;
        return;
      }

      _button.disabled = false;
      if (instance.isRunning) {
        this.btnStart.setAttribute('label', brDict['BTN_PAUSE']);
        this.setButtonIcon(this.btnStart, 'pause');
      } else {
        this.btnStart.setAttribute('label', brDict['BTN_START']);
        this.setButtonIcon(this.btnStart, 'play');
      }
    };

    this.btnReset.onClickHandler = this.resetAction;
    this.btnReset.onUpdateHandler = this.syncReadyState;

    this.querySelectorAll<HTMLElement & { engine: BreatheRhythmEngine }>('ui-overlay, ui-toolbar, ui-button')
        .forEach(el => {
          el.setAttribute('changeevent', brDict['STATE_CHANGE_EVENT']);
          el.engine = this.engine;
        });

    document.addEventListener('keydown', async (e: KeyboardEvent) => {
      if (!this.isIntroDone || e.repeat || !this.engine.isReady || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.engine.isRunning) {
          this.engine.pause();
        } else {
          await this.engine.start();
        }
      } else if (e.code === 'KeyR') {
        if (this.engine.isRunning || this.engine.isPaused || this.engine.isFinished) {
          e.preventDefault();
          this.engine.init();
        }
      } else if (e.code === 'Escape' && this.engine.isPaused) {
        e.preventDefault();
        await this.engine.start();
      }
    }, { signal: this.abortController?.signal });
  }

  public disconnectedCallback (): void {
    this.abortController?.abort();
    this.abortController = null;
  }
}

customElements.define('ui-app', UIApp);
