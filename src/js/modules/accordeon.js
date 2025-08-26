export default function accordeon(options = {}) {
  const cfg = {
    rootSelector: '.accordeon',
    itemSelector: '.accordeon__item',
    headerSelector: '.accordeon__item__top',
    panelSelector: '.accordeon__item__main',
    closeBtnSelector: '.accordeon__item__header__cross',
    singleOpen: true,
    openFirst: true,
    ...options,
  };

  const root = document.querySelector(cfg.rootSelector);
  if (!root) return;

  const items = Array.from(root.querySelectorAll(cfg.itemSelector));
  const panels = items
    .map(i => i.querySelector(cfg.panelSelector))
    .filter(Boolean);

  // сворачиваем всё
  panels.forEach(p => {
    p.style.overflow = 'hidden';
    p.style.height = '0px';
    p.style.transition = 'height 0.5s ease-in-out';
    p.setAttribute('aria-hidden', 'true');
  });
  items.forEach(item => {
    item.style.overflow = '';
    item.setAttribute('aria-expanded', 'false');
  });

  const isOpen = item => item.classList.contains('is-open');
  const setH = (panel, h) => {
    panel.style.height = `${h}px`;
  };

  const setOverflowOpen = item => {
    item.style.overflow = 'visible';
    const panel = item.querySelector(cfg.panelSelector);
    if (panel) panel.style.overflow = 'visible';
  };
  const setOverflowClosed = item => {
    item.style.overflow = '';
    const panel = item.querySelector(cfg.panelSelector);
    if (panel) panel.style.overflow = 'hidden';
  };

  const closeItem = item => {
    const panel = item.querySelector(cfg.panelSelector);
    if (!panel || !isOpen(item)) return;

    item.classList.remove('is-open'); // top снова покажется
    item.setAttribute('aria-expanded', 'false');
    setOverflowClosed(item);

    if (panel.style.height === 'auto') {
      panel.style.height = `${panel.scrollHeight}px`;
      panel.getBoundingClientRect();
    }
    requestAnimationFrame(() => {
      setH(panel, 0);
      panel.setAttribute('aria-hidden', 'true');
    });
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

    item.classList.add('is-open'); // top сворачивается
    item.setAttribute('aria-expanded', 'true');
    setOverflowClosed(item);

    panel.style.display = '';
    const start = panel.getBoundingClientRect().height;
    const target = panel.scrollHeight;

    if (panel.style.height === 'auto') panel.style.height = `${start}px`;
    requestAnimationFrame(() => {
      setH(panel, target);
    });

    const onEnd = e => {
      if (e.propertyName !== 'height') return;
      panel.style.height = 'auto';
      setOverflowOpen(item);
      panel.setAttribute('aria-hidden', 'false');
      panel.removeEventListener('transitionend', onEnd);
    };
    panel.addEventListener('transitionend', onEnd, { passive: true });
  };

  const toggleItem = item => (isOpen(item) ? closeItem(item) : openItem(item));

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

  window.addEventListener('resize', () => {
    items.forEach(item => {
      if (!isOpen(item)) return;
      const panel = item.querySelector(cfg.panelSelector);
      if (!panel) return;
      panel.style.height = `${panel.scrollHeight}px`;
      requestAnimationFrame(() => {
        panel.style.height = 'auto';
      });
      setOverflowOpen(item);
    });
  });

  if (cfg.openFirst && items[0]) {
    requestAnimationFrame(() => openItem(items[0]));
  }

  // клик по ссылкам в li
  const list = document.querySelector('.footer__links.main');

  list.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;

    const a = li.querySelector('a[href]');
    if (!a) return;
    if (e.target.closest('a')) return;

    const openInNew =
      e.metaKey || e.ctrlKey || e.button === 1 || a.target === '_blank';
    if (openInNew) {
      a.rel ||= 'noopener';
      window.open(a.href, a.target || '_blank');
    } else {
      a.click();
    }
  });

  // доступность с клавиатуры
  list.querySelectorAll('li').forEach(li => {
    li.tabIndex = 0;
    li.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        li.querySelector('a[href]')?.click();
      }
    });
  });
}
