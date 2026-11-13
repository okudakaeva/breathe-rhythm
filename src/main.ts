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

if (!engine || !controls || !pauseOverlay || !btnStart || !btnReset || !btnResume) {
  console.error('[Ошибка] Не удалось найти элементы управления в DOM. Проверьте ID в HTML.');
} else {
  const setButtonIcon = (cmp: UIButton, iconName: UIIconName) => {
    const icon = cmp.querySelector('ui-icon');
    if (icon) {
      icon.setAttribute('name', iconName);
    }
  };

  controls.onUpdateHandler = (toolbar: HTMLElement, instance: BreatheRhythmEngine) => {
    const isVisible = Boolean(instance && (instance.isRunning || instance.isFinished));
    toolbar.toggleAttribute('hidden', !isVisible);
  };
  controls.engine = engine;

  startOverlay.onUpdateHandler = (_overlay: HTMLElement, instance: BreatheRhythmEngine) => {
    return Boolean(instance && !instance.isRunning && !instance.isPaused && !instance.isFinished);
  };
  startOverlay.engine = engine;

  pauseOverlay.onUpdateHandler = (_overlay: HTMLElement, instance: BreatheRhythmEngine) => {
    return Boolean(instance && instance.isPaused);
  };
  pauseOverlay.engine = engine;

  btnInitStart.onClickHandler = async (_button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
    if (instance && instance.isReady) {
      await instance.start();
    }
  };
  btnInitStart.onUpdateHandler = (button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
    setButtonIcon(btnInitStart, !instance || !instance.isReady ? 'loader' : 'play');
    button.disabled = !instance || !instance.isReady;
  };
  btnInitStart.engine = engine;

  btnResume.onClickHandler = async (_button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
    if (instance && instance.isPaused) {
      await instance.start();
    }
  };
  btnResume.onUpdateHandler = (button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
    setButtonIcon(btnResume, 'play');
    button.disabled = !instance || !instance.isReady;
  };
  btnResume.engine = engine;

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
      btnStart.setAttribute('disabled', '');
      return;
    }

    btnStart.removeAttribute('disabled');
    if (instance.isRunning) {
      btnStart.setAttribute('label', 'Пауза');
      setButtonIcon(btnStart, 'pause');
    } else {
      btnStart.setAttribute('label', 'Старт');
      setButtonIcon(btnStart, 'play');
    }
  };
  btnStart.engine = engine;

  btnReset.onClickHandler = (_button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
    if (instance) {
      instance.init();
    }
  };
  btnReset.onUpdateHandler = (button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
    setButtonIcon(btnReset, 'reset');
    button.disabled = !instance || !instance.isReady;
  };
  btnReset.engine = engine;
}
