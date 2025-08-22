const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const fs = require('fs');
const gulp = require('gulp');
const fonter = require('gulp-fonter-fix');
const ttf2woff2 = require('gulp-ttf2woff2');
const merge = require('merge-stream'); // <= НОВОЕ

const srcFolder = './src';
const destFolder = './docs';

/** 1) .otf -> .ttf (в src/fonts) */
gulp.task('otfToTtf', () => {
  return gulp
    .src(`${srcFolder}/fonts/*.otf`, { allowEmpty: true })
    .pipe(
      plumber(
        notify.onError({
          title: 'FONTS',
          message: 'Error: <%= error.message %> (<%= file.relative %>)',
        })
      )
    )
    .pipe(fonter({ formats: ['ttf'] }))
    .pipe(gulp.dest(`${srcFolder}/fonts/`));
});

/** 2) .ttf -> .woff + .woff2 (в docs/fonts) — два независимых потока */
gulp.task('ttfToWeb', () => {
  const common = () =>
    gulp.src(`${srcFolder}/fonts/*.ttf`, { allowEmpty: true }).pipe(
      plumber(
        notify.onError({
          title: 'FONTS',
          message: 'Error: <%= error.message %> (<%= file.relative %>)',
        })
      )
    );

  const toWoff = common()
    .pipe(fonter({ formats: ['woff'] }))
    .pipe(gulp.dest(`${destFolder}/fonts/`));

  const toWoff2 = common()
    .pipe(ttf2woff2())
    .pipe(gulp.dest(`${destFolder}/fonts/`));

  return merge(toWoff, toWoff2);
});

/** 3) Скопировать готовые .woff2 из src (если есть) */
gulp.task('copyWoff2', () => {
  return gulp
    .src(`${srcFolder}/fonts/*.woff2`, { allowEmpty: true })
    .pipe(
      plumber(
        notify.onError({
          title: 'FONTS',
          message: 'Error: <%= error.message %> (<%= file.relative %>)',
        })
      )
    )
    .pipe(gulp.dest(`${destFolder}/fonts/`));
});

/** 4) (опционально) Скопировать исходные .otf/.ttf/.woff в docs/fonts */
gulp.task('copyRawFonts', () => {
  return gulp
    .src(`${srcFolder}/fonts/*.{otf,ttf,woff}`, { allowEmpty: true })
    .pipe(
      plumber(
        notify.onError({
          title: 'FONTS',
          message: 'Error: <%= error.message %> (<%= file.relative %>)',
        })
      )
    )
    .pipe(gulp.dest(`${destFolder}/fonts/`));
});

/** 5) Генерация SCSS после того как файлы лежат в docs/fonts */
gulp.task('fontsStyle', done => {
  const fontsDir = `${destFolder}/fonts/`;
  const fontsFile = `${srcFolder}/scss/base/_fontsAutoGen.scss`;

  fs.readdir(fontsDir, (err, files) => {
    if (err) {
      console.log(`[fontsStyle] Cannot read ${fontsDir}:`, err.message);
      return done();
    }
    // Фильтруем только существующие имена файлов-шрифтов
    const fontFiles = (files || []).filter(
      f => typeof f === 'string' && /\.(woff2?|ttf|otf)$/i.test(f)
    );

    if (!fontFiles.length) {
      console.log('[fontsStyle] No font files found in docs/fonts/');
      return done();
    }

    // Гарантируем, что директория под SCSS существует
    fs.mkdirSync(`${srcFolder}/scss/base/`, { recursive: true });
    fs.writeFileSync(fontsFile, '', 'utf8');

    const added = new Set();

    // Берем уникальные базовые имена (без расширения)
    const basenames = Array.from(
      new Set(fontFiles.map(f => f.replace(/\.(woff2?|ttf|otf)$/i, '')))
    );

    const weightMap = {
      thin: 100,
      extralight: 200,
      'extra-light': 200,
      ultralight: 200,
      light: 300,
      regular: 400,
      book: 400,
      normal: 400,
      medium: 500,
      semibold: 600,
      'semi-bold': 600,
      demibold: 600,
      'demi-bold': 600,
      bold: 700,
      extrabold: 800,
      'extra-bold': 800,
      heavy: 800,
      black: 900,
    };

    basenames.forEach(base => {
      if (!base || added.has(base)) return;

      // Разбор имени: FontName-Weight (учтем, что в названии шрифта тоже могут быть дефисы)
      const parts = base.split('-');
      const fontName = parts[0] || 'Font';
      const weightRaw =
        (parts.length > 1 ? parts[parts.length - 1] : 'regular') + '';
      const weightKey = weightRaw.trim().toLowerCase();

      const fontWeight = weightMap[weightKey] ?? 400;

      // Смотрим, какие форматы реально лежат
      const hasWoff2 = fontFiles.includes(`${base}.woff2`);
      const hasWoff = fontFiles.includes(`${base}.woff`);
      const hasTtf = fontFiles.includes(`${base}.ttf`);
      const hasOtf = fontFiles.includes(`${base}.otf`);

      const srcs = [];
      if (hasWoff2) srcs.push(`url("../fonts/${base}.woff2") format("woff2")`);
      if (hasWoff) srcs.push(`url("../fonts/${base}.woff") format("woff")`);
      if (hasTtf) srcs.push(`url("../fonts/${base}.ttf") format("truetype")`);
      if (hasOtf) srcs.push(`url("../fonts/${base}.otf") format("opentype")`);

      if (!srcs.length) {
        console.log(`[fontsStyle] Skip "${base}" — no valid formats found.`);
        return;
      }

      const content = `@font-face {
  font-family: "${fontName}";
  font-display: swap;
  src: ${srcs.join(', ')};
  font-weight: ${fontWeight};
  font-style: normal;
}

`;

      // На всякий случай проверим, что это строка
      if (typeof content !== 'string') {
        console.log(`[fontsStyle] Unexpected content type for "${base}"`);
        return;
      }

      try {
        fs.appendFileSync(fontsFile, content, 'utf8');
        added.add(base);
      } catch (e) {
        console.log(`[fontsStyle] append failed for "${base}":`, e.message);
      }
    });

    done();
  });
});

/** 6) Главная последовательность */
gulp.task(
  'fontsDocs',
  gulp.series('otfToTtf', 'ttfToWeb', 'copyWoff2', 'copyRawFonts', 'fontsStyle')
);
