import { BreatheRhythmEngine } from './breathe_rhythm_engine.ts';
import { UIButton } from './ui/ui_button.ts';
import { UIIconName } from './ui/ui_icon.ts';
import { UIOverlay } from './ui/ui_overlay.ts';
import { UIToolbar } from './ui/ui_toolbar.ts';

const engine = document.getElementById('engine') as BreatheRhythmEngine;
const controls = document.getElementById('controls') as UIToolbar;
const startOverlay = document.getElementById('startOverlay') as UIOverlay;
const pauseOverlay = document.getElementById('pauseOverlay') as UIOverlay;
const btnInitStart = document.getElementById('btnInitStart') as UIButton;
const btnStart = document.getElementById('btnStart') as UIButton;
const btnReset = document.getElementById('btnReset') as UIButton;
const btnResume = document.getElementById('btnResume') as UIButton;

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
const required = [engine, controls, startOverlay, pauseOverlay, btnInitStart, btnStart, btnReset, btnResume];
let isInitialBoot = true;

if (required.some(el => !el)) {
  console.error('[Ошибка] Не удалось найти элементы управления в DOM. Проверьте ID в HTML.');
} else {
  controls.onUpdateHandler = (_toolbar: HTMLElement, instance: BreatheRhythmEngine) => {
    const isVisible = Boolean(instance && (instance.isRunning || instance.isFinished));
    _toolbar.toggleAttribute('hidden', !isVisible);
  };

  startOverlay.onUpdateHandler = (_overlay: HTMLElement, instance: BreatheRhythmEngine) => {
    return Boolean(instance && !instance.isRunning && !instance.isPaused && !instance.isFinished);
  };
  startOverlay.onUpdateHandler = (_overlay: UIOverlay, instance: BreatheRhythmEngine) => {
    const shouldShow = Boolean(instance && !instance.isRunning && !instance.isPaused && !instance.isFinished);

    if (shouldShow) {
      _overlay.delay = isInitialBoot ? 0 : 170;
      isInitialBoot = false;
    }

    return shouldShow;
  };

  pauseOverlay.onUpdateHandler = (_overlay: HTMLElement, instance: BreatheRhythmEngine) => {
    return Boolean(instance && instance.isPaused);
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
      btnStart.setAttribute('label', 'Загрузка');
      _button.disabled = true;
      return;
    }

    _button.disabled = false;
    if (instance.isRunning) {
      btnStart.setAttribute('label', 'Пауза');
      setButtonIcon(btnStart, 'pause');
    } else {
      btnStart.setAttribute('label', 'Старт');
      setButtonIcon(btnStart, 'play');
    }
  };

  btnReset.onClickHandler = resetAction;
  btnReset.onUpdateHandler = syncReadyState;

  document.querySelectorAll<HTMLElement & { engine: BreatheRhythmEngine }>('[changeevent]')
      .forEach(el => {
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
