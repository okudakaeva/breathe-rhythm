import { BreatheRhythmEngineComponent } from './breathe_rhythm_engine.ts';
import { UIButton } from './ui/ui_button.ts';

const engine = document.getElementById('perfEngine') as BreatheRhythmEngineComponent;
const btnStart = document.getElementById('btnStart') as UIButton;
const btnReset = document.getElementById('btnReset') as UIButton;

if (!engine || !btnStart || !btnReset) {
  console.error('[Ошибка] Не удалось найти элементы управления в DOM. Проверьте ID в HTML.');
} else {
  const setButtonIcon = (cmp: UIButton, iconName: string) => {
    const icon = cmp.querySelector('ui-icon');
    if (icon) {
      icon.setAttribute('name', iconName);
    }
  };

  btnStart.onClickHandler = async (button: HTMLButtonElement, instance: any) => {
    if (!instance) return;
    if (instance.isRunning) {
      instance.pause();
    } else {
      await instance.start();
    }
  };
  btnStart.onUpdateHandler = (button: HTMLButtonElement, instance: any) => {
    if (!instance) {
      button.textContent = '---';
      button.disabled = true;
      return;
    }
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

  btnReset.onClickHandler = (button: HTMLButtonElement, instance: any) => {
    if (instance) instance.init();
  };
  btnReset.onUpdateHandler = (button: HTMLButtonElement, instance: any) => {
    setButtonIcon(btnReset, 'reset');
    button.disabled = !instance || !instance.isReady;
  };
  btnReset.engine = engine;
}
