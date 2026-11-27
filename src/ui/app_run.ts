import { brDict } from '../br_dictionary';

const appRun = (root: ParentNode = document): void => {
  root.querySelectorAll<HTMLElement>('[data-dict]')
      .forEach((el) => {
        const key = el.dataset.dict;
        if (!key || !(key in brDict)) {
          return;
        }

        const val = String(brDict[key]);
        if (el.tagName === 'UI-BUTTON' || el.tagName === 'UI-LOGO' || el.tagName === 'UI-SUBTITLE') {
          el.setAttribute('label', val);
        } else {
          el.textContent = val;
        }
        el.removeAttribute('data-dict')
      });

  root.querySelectorAll<HTMLElement>('[data-id]')
      .forEach((el) => {
        const id = el.dataset.id;

        if (!id || !(id in brDict)) {
          return;
        }

        const val = String(brDict[id]);
        el.setAttribute('id', val);
        el.removeAttribute('data-id')
      });
}

appRun();
