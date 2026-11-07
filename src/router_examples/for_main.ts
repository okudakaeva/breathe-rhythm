const router = document.getElementById('router') as any;
const engine = document.getElementById('perfEngine') as any;

router.addEventListener('route-change', async (e: CustomEvent) => {
  const path = e.detail.path;

  // 1. Если мы на главной — можем показать список стихов
  if (path === '/' || path === '/index.html') {
    console.log('Показываем меню выбора стихов');
    return;
  }

  // 2. Если путь ведет к конкретному стиху, например: /poem/grohot-tishiny
  if (path.startsWith('/poem/')) {
    const poemSlug = path.replace('/poem/', ''); // Получаем 'grohot-tishiny'

    // Движок перед загрузкой нового стиха гасит старый перформанс
    engine.init();

    // Спокойно запрашиваем нужный JSON файл динамически по слагу пути!
    try {
      const response = await fetch(`./poems/${poemSlug}.json`);
      const data = await response.json();
      const pkg = data[0];

      // Инжектим данные в движок снаружи через его приватные свойства
      // (или сделаем для этого публичный метод/сеттер, как для кнопок)
      engine.poemRaw = pkg.lines;
      engine.poemMeta = pkg.meta;
      engine.poemConfig = pkg.config;

      // Переинициализируем движок под новый стих
      engine.init();
    } catch (err) {
      console.error('Стихотворение не найдено:', err);
    }
  }
});
