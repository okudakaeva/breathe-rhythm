export class UIRouter extends HTMLElement {
  constructor() {
    super();
  }

  public connectedCallback(): void {
    // Слушаем, когда пользователь нажимает кнопку "Назад" или "Вперед" в браузере
    window.addEventListener('popstate', this.handleRoute);

    // Перехватываем обычные клики по ссылкам, чтобы страница не перезагружалась
    document.addEventListener('click', this.handleLinkClick);

    // Сразу определяем текущий путь при загрузке страницы
    this.handleRoute();
  }

  public disconnectedCallback(): void {
    window.removeEventListener('popstate', this.handleRoute);
    document.removeEventListener('click', this.handleLinkClick);
  }

  // Метод для программного перехода из JS: router.navigate('/poem/grohot-tishiny')
  public navigate(path: string): void {
    window.history.pushState(null, '', path);
    this.handleRoute();
  }

  private handleRoute = (): void => {
    const path = window.location.pathname; // Получаем чистый путь, например "/poem/grohot-tishiny"

    // Декларативно сообщаем приложению, какой сейчас путь
    this.dispatchEvent(new CustomEvent('route-change', {
      bubbles: true,
      detail: { path }
    }));
  };

  private handleLinkClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');

    // Если кликнули по ссылке, и она ведет на наш же сайт — отменяем перезагрузку
    if (link && link.href && link.origin === window.location.origin) {
      e.preventDefault();
      this.navigate(link.pathname);
    }
  };
}

customElements.define('ui-router', UIRouter);
