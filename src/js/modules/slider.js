export default function initReviewsSlider() {
  const wrapper = document.querySelector('.reviews .slide__wrapper');
  const prevBtn = document.querySelector('.reviews .slider__control--prev');
  const nextBtn = document.querySelector('.reviews .slider__control--next');
  if (!wrapper) return;

  const originalSlides = Array.from(wrapper.querySelectorAll('.slide'));
  if (originalSlides.length === 0) return;

  const track = document.createElement('div');
  track.className = 'slides-track';
  wrapper.appendChild(track);
  originalSlides.forEach(slide => track.appendChild(slide));

  const firstClone = originalSlides[0].cloneNode(true);
  const lastClone = originalSlides[originalSlides.length - 1].cloneNode(true);
  track.insertBefore(lastClone, track.firstChild);
  track.appendChild(firstClone);

  track.style.transition = 'transform 0.6s ease';
  Array.from(track.children).forEach(s => (s.style.flex = '0 0 100%'));

  const REAL_COUNT = originalSlides.length;
  let index = 1;
  let locked = false;

  const setTransition = enabled =>
    (track.style.transition = enabled ? 'transform 0.6s ease' : 'none');

  const applyTransform = () =>
    (track.style.transform = 'translateX(' + -index * 100 + '%)');

  setTransition(false);
  applyTransform();
  requestAnimationFrame(() => setTransition(true));

  const goNext = () => {
    if (locked) return;
    locked = true;
    index += 1;
    applyTransform();
  };
  const goPrev = () => {
    if (locked) return;
    locked = true;
    index -= 1;
    applyTransform();
  };

  nextBtn && nextBtn.addEventListener('click', goNext);
  prevBtn && prevBtn.addEventListener('click', goPrev);

  track.addEventListener('transitionend', () => {
    if (index === REAL_COUNT + 1) {
      setTransition(false);
      index = 1;
      applyTransform();
      requestAnimationFrame(() => setTransition(true));
    }
    if (index === 0) {
      setTransition(false);
      index = REAL_COUNT;
      applyTransform();
      requestAnimationFrame(() => setTransition(true));
    }
    locked = false;
  });

  let startX = null;
  wrapper.addEventListener(
    'touchstart',
    e => {
      startX = e.touches[0].clientX;
    },
    { passive: true }
  );

  wrapper.addEventListener('touchend', e => {
    if (startX == null) return;
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) < 30) return;
    dx < 0 ? goNext() : goPrev();
  });
}
