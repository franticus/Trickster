// ---------- Core ----------
const gulp = require('gulp');
const fs = require('fs');

// ---------- HTML ----------
const fileInclude = require('gulp-file-include');
const replace = require('gulp-replace');
const webpHTML = require('gulp-webp-retina-html'); // оставляем этот плагин
const typograf = require('gulp-typograf');
const prettier = require('@bdchauvette/gulp-prettier');

// ---------- Styles ----------
const sass = require('gulp-sass')(require('sass'));
const sassGlob = require('gulp-sass-glob');
const sourceMaps = require('gulp-sourcemaps');

// ---------- Server, clean, utils ----------
const server = require('gulp-server-livereload');
const clean = require('gulp-clean');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const changed = require('gulp-changed');

// ---------- JS ----------
const webpack = require('webpack-stream');
// const babel = require('gulp-babel'); // при необходимости раскомментируй

// ---------- Images ----------
const imagemin = require('gulp-imagemin');
const imageminWebp = require('imagemin-webp');
const rename = require('gulp-rename');

// ---------- SVG ----------
const svgsprite = require('gulp-svg-sprite');

// ---------------------------------------------
// Общие настройки
// ---------------------------------------------
const fileIncludeSetting = {
  prefix: '@@',
  basepath: '@file',
};

const plumberNotify = title => ({
  errorHandler: notify.onError({
    title,
    message: 'Error <%= error.message %>',
    sound: false,
  }),
});

// ---------------------------------------------
// Clean
// ---------------------------------------------
gulp.task('clean:dev', function(done) {
  if (fs.existsSync('./build/')) {
    return gulp.src('./build/', { read: false }).pipe(clean({ force: true }));
  }
  done();
});

// ---------------------------------------------
// HTML
// ---------------------------------------------
gulp.task('html:dev', function() {
  return (
    gulp
      .src([
        './src/html/**/*.html',
        '!./**/blocks/**/*.*',
        '!./src/html/docs/**/*.*',
      ])
      .pipe(changed('./build/', { hasChanged: changed.compareContents }))
      .pipe(plumber(plumberNotify('HTML')))
      .pipe(fileInclude(fileIncludeSetting))
      // нормализуем относительные пути
      .pipe(
        replace(
          /(?<=src=|href=|srcset=)(['"])(\.(\.)?\/)*(img|images|fonts|css|scss|sass|js|files|audio|video)(\/[^\/'"]+(\/))?([^'"]*)\1/gi,
          '$1./$4$5$7$1'
        )
      )
      // генерируем <picture> c webp
      .pipe(
        webpHTML({
          extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          retina: { 1: '', 2: '@2x' },
        })
      )
      // ИСПРАВЛЕНИЕ путей плагина: folder.webp/file.webp -> folder/file.webp
      .pipe(
        replace(
          /(\bimg|images)\/([^\/]+)\.webp\/([^"'\s)]+\.webp)/g,
          '$1/$2/$3'
        )
      )
      // при необходимости включай типограф
      // .pipe(
      //   typograf({
      //     locale: ['ru', 'en-US'],
      //     htmlEntity: { type: 'digit' },
      //     disableRule: ['common/nbsp/*'],
      //   })
      // )
      .pipe(
        prettier({
          tabWidth: 4,
          useTabs: true,
          printWidth: 182,
          trailingComma: 'es5',
          bracketSpacing: false,
        })
      )
      .pipe(gulp.dest('./build/'))
  );
});

// ---------------------------------------------
// Styles
// ---------------------------------------------
gulp.task('sass:dev', function() {
  return (
    gulp
      .src('./src/scss/*.scss')
      .pipe(changed('./build/css/'))
      .pipe(plumber(plumberNotify('SCSS')))
      .pipe(sourceMaps.init())
      .pipe(sassGlob())
      .pipe(sass())
      // починка относительных путей в CSS
      .pipe(
        replace(
          /(['"]?)(\.\.\/)+(img|images|fonts|css|scss|sass|js|files|audio|video)(\/[^\/'"]+(\/))?([^'"]*)\1/gi,
          '$1$2$3$4$6$1'
        )
      )
      .pipe(sourceMaps.write())
      .pipe(gulp.dest('./build/css/'))
  );
});

// ---------------------------------------------
// Images
// ---------------------------------------------
gulp.task('images:dev', function() {
  return (
    gulp
      // 1) Генерация .webp только из растров
      .src(['./src/img/**/*.{jpg,jpeg,png,gif}', '!./src/img/svgicons/**/*'])
      .pipe(changed('./build/img/', { extension: '.webp' }))
      .pipe(
        imagemin([
          imageminWebp({
            quality: 85,
          }),
        ])
      )
      .pipe(rename({ extname: '.webp' }))
      .pipe(gulp.dest('./build/img/'))

      // 2) Копируем оригиналы и любые прочие файлы (в т.ч. svg)
      .pipe(gulp.src(['./src/img/**/*', '!./src/img/svgicons/**/*']))
      .pipe(changed('./build/img/'))
      // .pipe(imagemin({ verbose: true })) // если нужно сжимать оригиналы
      .pipe(gulp.dest('./build/img/'))
  );
});

// ---------------------------------------------
// SVG sprites
// ---------------------------------------------
const svgStack = {
  mode: {
    stack: {
      example: true,
    },
  },
  shape: {
    transform: [
      {
        svgo: {
          js2svg: { indent: 4, pretty: true },
        },
      },
    ],
  },
};

const svgSymbol = {
  mode: {
    symbol: {
      sprite: '../sprite.symbol.svg',
    },
  },
  shape: {
    transform: [
      {
        svgo: {
          js2svg: { indent: 4, pretty: true },
          plugins: [
            {
              name: 'removeAttrs',
              params: { attrs: '(fill|stroke)' },
            },
          ],
        },
      },
    ],
  },
};

gulp.task('svgStack:dev', function() {
  return gulp
    .src('./src/img/svgicons/**/*.svg')
    .pipe(plumber(plumberNotify('SVG:dev')))
    .pipe(svgsprite(svgStack))
    .pipe(gulp.dest('./build/img/svgsprite/'));
});

gulp.task('svgSymbol:dev', function() {
  return gulp
    .src('./src/img/svgicons/**/*.svg')
    .pipe(plumber(plumberNotify('SVG:dev')))
    .pipe(svgsprite(svgSymbol))
    .pipe(gulp.dest('./build/img/svgsprite/'));
});

// ---------------------------------------------
// Files
// ---------------------------------------------
gulp.task('files:dev', function() {
  return gulp
    .src('./src/files/**/*')
    .pipe(changed('./build/files/'))
    .pipe(gulp.dest('./build/files/'));
});

// ---------------------------------------------
// JS
// ---------------------------------------------
gulp.task('js:dev', function() {
  return (
    gulp
      .src('./src/js/*.js')
      .pipe(changed('./build/js/'))
      .pipe(plumber(plumberNotify('JS')))
      // .pipe(babel()) // если нужен Babel — раскомментируй и настрой
      .pipe(webpack(require('./../webpack.config.js')))
      .pipe(gulp.dest('./build/js/'))
  );
});

// ---------------------------------------------
// Server
// ---------------------------------------------
const serverOptions = { livereload: true, open: true };

gulp.task('server:dev', function() {
  return gulp.src('./build/').pipe(server(serverOptions));
});

// ---------------------------------------------
// Watchers
// ---------------------------------------------
gulp.task('watch:dev', function() {
  gulp.watch('./src/scss/**/*.scss', gulp.parallel('sass:dev'));

  gulp.watch(
    ['./src/html/**/*.html', './src/html/**/*.json'],
    gulp.parallel('html:dev')
  );

  // ВАЖНО: сначала пересобрать картинки (webp), потом обновить HTML
  gulp.watch('./src/img/**/*', gulp.series('images:dev', 'html:dev'));

  gulp.watch('./src/files/**/*', gulp.parallel('files:dev'));
  gulp.watch('./src/js/**/*.js', gulp.parallel('js:dev'));

  gulp.watch(
    './src/img/svgicons/*',
    gulp.series('svgStack:dev', 'svgSymbol:dev')
  );
});

// ---------------------------------------------
// Основные сценарии
// ---------------------------------------------
gulp.task(
  'build:dev',
  gulp.series(
    'clean:dev',
    'images:dev', // webp уже на месте
    gulp.parallel(
      'sass:dev',
      'js:dev',
      'files:dev',
      'svgStack:dev',
      'svgSymbol:dev',
      'html:dev' // теперь webp ссылки будут валидными
    )
  )
);

gulp.task(
  'default',
  gulp.series('build:dev', gulp.parallel('server:dev', 'watch:dev'))
);
