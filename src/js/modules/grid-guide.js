function gridGuide() {
  let clickCount = 0;
  let lastClickTime = 0;

  document.addEventListener('click', function() {
    const now = Date.now();

    if (now - lastClickTime < 500) {
      clickCount++;
    } else {
      clickCount = 1;
    }
    lastClickTime = now;

    if (clickCount === 4) {
      clickCount = 0;
      const el = document.querySelector('.grid-guides');
      if (el) {
        el.style.display = el.style.display === 'none' ? 'flex' : 'none';
      }
    }
  });
}

export default gridGuide;
