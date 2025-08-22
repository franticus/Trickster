const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const fs = require('fs');
const gulp = require('gulp');
const fonter = require('gulp-fonter-fix');
const ttf2woff2 = require('gulp-ttf2woff2');
const merge = require('merge-stream'); // npm i merge-stream

const srcFolder = './src';
const destFolder = './build';

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

/** 2) .ttf -> .woff + .woff2 (в build/fonts) — корректные отдельные потоки */
gulp.task('ttfToWeb', () => {
  const common = () =>
    gulp
      .src(`${srcFolder}/fonts/*.ttf`, { allowEmpty: true })
      .pipe(
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

/** 3) Скопировать уже готовые .woff2 из src (если есть) */
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

/** 4) (НЕОБЯЗАТЕЛЬНО) Скопировать исходные .otf/.ttf/.woff в build, если они тоже нужны в билд-папке */
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

/** 5) Генерация SCSS после того, как все шрифты оказались в build/fonts */
gulp.task('fontsStyle', done => {
  const fontsFile = `${srcFolder}/scss/base/_fontsAutoGen.scss`;
  fs.readdir(`${destFolder}/fonts/`, (err, files) => {
    if (!files || !files.length) {
      console.log('No font files found in build/fonts/');
      return done();
    }
    fs.writeFileSync(fontsFile, '');
    const added = new Set();

    files.forEach(file => {
      if (!/\.(woff2?|ttf|otf)$/i.test(file)) return;
      const fontFileName = file.replace(/\.(woff2?|ttf|otf)$/i, '');
      if (added.has(fontFileName)) return;

      const [fontNameRaw, weightRaw = 'regular'] = fontFileName.split('-');
      const fontName = fontNameRaw || 'Font';
      const map = {
        thin: 100,
        extralight: 200,
        light: 300,
        regular: 400,
        book: 400,
        medium: 500,
        semibold: 600,
        demibold: 600,
        bold: 700,
        extrabold: 800,
        heavy: 800,
        black: 900,
      };
      const fontWeight = map[weightRaw.toLowerCase()] ?? 400;

      const w2 = files.includes(`${fontFileName}.woff2`);
      const w1 = files.includes(`${fontFileName}.woff`);
      const ttf = files.includes(`${fontFileName}.ttf`);
      const otf = files.includes(`${fontFileName}.otf`);

      const srcs = [];
      if (w2)
        srcs.push(`url("../fonts/${fontFileName}.woff2") format("woff2")`);
      if (w1) srcs.push(`url("../fonts/${fontFileName}.woff") format("woff")`);
      if (ttf)
        srcs.push(`url("../fonts/${fontFileName}.ttf") format("truetype")`);
      if (otf)
        srcs.push(`url("../fonts/${fontFileName}.otf") format("opentype")`);

      if (srcs.length) {
        fs.appendFileSync(
          fontsFile,
          `@font-face {
  font-family: "${fontName}";
  font-display: swap;
  src: ${srcs.join(', ')};
  font-weight: ${fontWeight};
  font-style: normal;
}\n`
        );
        added.add(fontFileName);
      }
    });
    done();
  });
});

/** 6) Главная последовательность */
gulp.task(
  'fontsDev',
  gulp.series('otfToTtf', 'ttfToWeb', 'copyWoff2', 'copyRawFonts', 'fontsStyle')
);
