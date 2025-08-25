export default function accordeon(options = {}) {
  const cfg = {
    rootSelector: '.accordeon',
    itemSelector: '.accordeon__item',
    headerSelector: '.accordeon__item__top',
    panelSelector: '.accordeon__item__main',
    closeBtnSelector: '.accordeon__item__header__cross',
    singleOpen: false,
    openFirst: true, // <-- авто-открыть первый элемент
    ...options,
  };

  const root = document.querySelector(cfg.rootSelector);
  if (!root) return;

  const items = Array.from(root.querySelectorAll(cfg.itemSelector));
  const panels = items
    .map(i => i.querySelector(cfg.panelSelector))
    .filter(Boolean);

  // Базовая инициализация (свернули всё)
  panels.forEach(p => {
    p.style.overflow = 'hidden';
    p.style.height = '0px';
    p.style.transition = 'height 0.35s ease';
    p.setAttribute('aria-hidden', 'true');
  });
  items.forEach(item => item.setAttribute('aria-expanded', 'false'));

  const isOpen = item => item.classList.contains('is-open');
  const setPanelHeight = (panel, h) => {
    panel.style.height = `${h}px`;
  };

  const openItem = item => {
    const panel = item.querySelector(cfg.panelSelector);
    if (!panel) return;

    if (cfg.singleOpen) {
      items.forEach(it => {
        if (it !== item && isOpen(it)) closeItem(it);
      });
    }
    if (isOpen(item)) return;

    item.classList.add('is-open');
    item.setAttribute('aria-expanded', 'true');

    // На время анимации скрываем перелив (потом включим visible)
    panel.style.overflow = 'hidden';
    panel.style.display = '';
    const start = panel.getBoundingClientRect().height; // обычно 0
    const target = panel.scrollHeight;

    if (panel.style.height === 'auto') {
      panel.style.height = `${start}px`;
    }
    requestAnimationFrame(() => {
      setPanelHeight(panel, target);
    });

    const onEnd = e => {
      if (e.propertyName !== 'height') return;
      panel.style.height = 'auto';
      panel.style.overflow = 'visible'; // <-- показать «выходящий» контент
      panel.setAttribute('aria-hidden', 'false');
      panel.removeEventListener('transitionend', onEnd);
    };
    panel.addEventListener('transitionend', onEnd, { passive: true });
  };

  const closeItem = item => {
    const panel = item.querySelector(cfg.panelSelector);
    if (!panel || !isOpen(item)) return;

    item.classList.remove('is-open');
    item.setAttribute('aria-expanded', 'false');

    // Перед схлопыванием снова прячем перелив
    panel.style.overflow = 'hidden';

    if (panel.style.height === 'auto') {
      panel.style.height = `${panel.scrollHeight}px`;
      panel.getBoundingClientRect(); // форс рефлоу
    }
    requestAnimationFrame(() => {
      setPanelHeight(panel, 0);
      panel.setAttribute('aria-hidden', 'true');
    });
  };

  const toggleItem = item => (isOpen(item) ? closeItem(item) : openItem(item));

  // Делегирование кликов
  root.addEventListener('click', e => {
    const header = e.target.closest(cfg.headerSelector);
    if (header && root.contains(header)) {
      const item = header.closest(cfg.itemSelector);
      if (item) toggleItem(item);
      return;
    }
    const closeBtn = e.target.closest(cfg.closeBtnSelector);
    if (closeBtn && root.contains(closeBtn)) {
      const item = closeBtn.closest(cfg.itemSelector);
      if (item) closeItem(item);
    }
  });

  // Актуализация высоты у открытых при ресайзе
  const onResize = () => {
    items.forEach(item => {
      if (!isOpen(item)) return;
      const panel = item.querySelector(cfg.panelSelector);
      if (!panel) return;
      // кратко фиксируем высоту в px, затем возвращаем auto
      panel.style.height = `${panel.scrollHeight}px`;
      requestAnimationFrame(() => {
        panel.style.height = 'auto';
      });
    });
  };
  window.addEventListener('resize', onResize);

  // Авто-открыть первый элемент (если есть)
  if (cfg.openFirst && items[0]) {
    // Дадим стилям примениться прежде чем анимировать
    requestAnimationFrame(() => openItem(items[0]));
  }
}
