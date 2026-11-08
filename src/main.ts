import { BreatheRhythmEngine } from './breathe_rhythm_engine.ts';
import { UIButton } from './ui/ui_button.ts';
import { UIIconName } from './ui/ui_icon.ts';

const engine = document.getElementById('engine') as BreatheRhythmEngine;
const btnStart = document.getElementById('btnStart') as UIButton;
const btnReset = document.getElementById('btnReset') as UIButton;

if (!engine || !btnStart || !btnReset) {
  console.error('[Ошибка] Не удалось найти элементы управления в DOM. Проверьте ID в HTML.');
} else {
  const setButtonIcon = (cmp: UIButton, iconName: UIIconName) => {
    const icon = cmp.querySelector('ui-icon');
    if (icon) {
      icon.setAttribute('name', iconName);
    }
  };

  btnStart.onClickHandler = async (button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
    if (!instance) return;
    if (instance.isRunning) {
      instance.pause();
    } else {
      await instance.start();
    }
  };
  btnStart.onUpdateHandler = (button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
    if (!instance.isReady) {
      setButtonIcon(btnStart, 'loader');
      button.disabled = true;
      return;
    }

    button.disabled = false;
    if (instance.isRunning) {
      setButtonIcon(btnStart, 'pause');
    } else {
      setButtonIcon(btnStart, 'play');
    }
  };
  btnStart.engine = engine;

  btnReset.onClickHandler = (button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
    if (instance) instance.init();
  };
  btnReset.onUpdateHandler = (button: HTMLButtonElement, instance: BreatheRhythmEngine) => {
    setButtonIcon(btnReset, 'reset');
    button.disabled = !instance || !instance.isReady;
  };
  btnReset.engine = engine;
}
