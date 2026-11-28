import { brDict, isBrDictKey } from '../br_dictionary';

const getElementsWithData = (root: ParentNode = document) => [...root.querySelectorAll<HTMLElement>('*')]
    .filter(
        (el) => Object.keys(el.dataset).length > 0
    );

const appRun = (root: ParentNode = document): void => {
  const elements = getElementsWithData(root);

  elements.forEach((el: HTMLElement) => {
    Object.entries(el.dataset).forEach(([key, data]) => {
      if (!isBrDictKey(data)) {
        return;
      }

      const val = String(brDict[data]);

      switch (key) {
        case 'text': {
          if (el.tagName === 'UI-BUTTON') {
            el.setAttribute('label', val);
          } else {
            el.textContent = val;
          }

          break;
        }
        default: {
          el.setAttribute(key, val);
          break;
        }
      }

      el.removeAttribute(`data-${ key }`);
    });
  });
}

appRun();
