import { applyDict, brDict } from './br_dictionary.ts';
import { BreatheRhythmEngine } from './breathe_rhythm_engine.ts';
import { UIButton, UIIconName, UIOverlay, UIToolbar } from './ui';
import { delay } from './br_delay.ts';

applyDict();

let isIntroPlayed = false;
const engine = document.getElementById('engine') as BreatheRhythmEngine;
const controls = document.getElementById('controls') as UIToolbar;
const startOverlay = document.getElementById('startOverlay') as UIOverlay;
const pauseOverlay = document.getElementById('pauseOverlay') as UIOverlay;
const btnInitStart = document.getElementById('btnInitStart') as UIButton;
const btnStart = document.getElementById('btnStart') as UIButton;
const btnReset = document.getElementById('btnReset') as UIButton;
const btnResume = document.getElementById('btnResume') as UIButton;
const required = [engine, controls, startOverlay, pauseOverlay, btnInitStart, btnStart, btnReset, btnResume];

const setButtonIcon = (cmp: UIButton, iconName: UIIconName) => {
  const icon = cmp.querySelector('ui-icon');
  if (icon) {
    icon.setAttribute('name', iconName);
  }
};
const startAction = async (_btn: HTMLButtonElement, inst: BreatheRhythmEngine) => {
  if (inst?.isReady) {
    await inst.start();
  }
};
const resetAction = (_btn: HTMLButtonElement, inst: BreatheRhythmEngine) => inst?.init();
const syncReadyState = (button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
  button.disabled = !instance || !instance.isReady;
};
const runOnVisibleTab = async () => {
  if (document.hidden) {
    return new Promise<void>(resolve => document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        resolve();
      }
    }, { once: true }));
  }

  return Promise.resolve();
};

if (required.some(el => !el)) {
  console.error('[Ошибка] Не удалось найти элементы управления в DOM. Проверьте ID в HTML.');
} else {
  controls.onUpdateHandler = (_toolbar: HTMLElement, instance: BreatheRhythmEngine) => {
    const isVisible = Boolean(instance && (instance.isRunning || instance.isFinished));
    _toolbar.toggleAttribute('hidden', !isVisible);
  };

  startOverlay.onUpdateHandler = (_overlay: UIOverlay, instance: BreatheRhythmEngine) => {
    const shouldShow = Boolean(instance && !instance.isRunning && !instance.isPaused && !instance.isFinished);

    if (shouldShow) {
      if (!isIntroPlayed) {
        _overlay.classList.remove('intro-anim');
        void (async () => {
          await runOnVisibleTab();
          await delay(brDict['INTRO_START_DELAY']);

          if (!isIntroPlayed) {
            isIntroPlayed = true;
            _overlay.classList.add('intro-anim');
          }
        })();
      }

      _overlay.delay = isIntroPlayed ? 170 : 0;
    }

    return shouldShow;
  };

  pauseOverlay.onUpdateHandler = (_overlay: UIOverlay, instance: BreatheRhythmEngine, detail?: { reason?: string }) => {
    const isPaused = Boolean(instance && instance.isPaused);
    const isInstant = isPaused && (detail?.reason === 'resize' || detail?.reason === 'hidden');

    _overlay.toggleAttribute('instant', isInstant);
    _overlay.delay = isInstant ? 0 : 350;

    return isPaused;
  };

  btnInitStart.onClickHandler = startAction;
  btnInitStart.onUpdateHandler = (_button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
    setButtonIcon(btnInitStart, !instance || !instance.isReady ? 'loader' : 'play');
    _button.disabled = !instance || !instance.isReady;
  };

  btnResume.onClickHandler = startAction;
  btnResume.onUpdateHandler = syncReadyState;

  btnStart.onClickHandler = async (_button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
    if (!instance) {
      return;
    }

    if (instance.isRunning) {
      instance.pause();
    } else {
      await instance.start();
    }
  };
  btnStart.onUpdateHandler = (_button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
    if (!instance || !instance.isReady) {
      setButtonIcon(btnStart, 'loader');
      btnStart.setAttribute('label', brDict['BTN_LOADING']);
      _button.disabled = true;
      return;
    }

    _button.disabled = false;
    if (instance.isRunning) {
      btnStart.setAttribute('label', brDict['BTN_PAUSE']);
      setButtonIcon(btnStart, 'pause');
    } else {
      btnStart.setAttribute('label', brDict['BTN_START']);
      setButtonIcon(btnStart, 'play');
    }
  };

  btnReset.onClickHandler = resetAction;
  btnReset.onUpdateHandler = syncReadyState;

  document.querySelectorAll<HTMLElement & { engine: BreatheRhythmEngine }>('ui-overlay, ui-toolbar, ui-button')
      .forEach(el => {
        el.setAttribute('changeevent', brDict['STATE_CHANGE_EVENT']);
        el.engine = engine;
      });

  document.addEventListener('keydown', async (e: KeyboardEvent) => {
    if (e.repeat || !engine.isReady || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      if (engine.isRunning) {
        engine.pause();
      } else {
        await engine.start();
      }
    } else if (e.code === 'KeyR') {
      if (engine.isRunning || engine.isPaused || engine.isFinished) {
        e.preventDefault();
        engine.init();
      }
    } else if (e.code === 'Escape' && engine.isPaused) {
      e.preventDefault();
      await engine.start();
    }
  });
}
