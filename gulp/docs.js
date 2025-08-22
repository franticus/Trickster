const gulp = require('gulp');
const replace = require('gulp-replace');

// HTML
const fileInclude = require('gulp-file-include');
const htmlclean = require('gulp-htmlclean');
const webpHTML = require('gulp-webp-retina-html');
const prettier = require('@bdchauvette/gulp-prettier');

// SASS
const sass = require('gulp-sass')(require('sass'));
const sassGlob = require('gulp-sass-glob');
const autoprefixer = require('gulp-autoprefixer');
const csso = require('gulp-csso');
const webImagesCSS = require('gulp-web-images-css');
const sourceMaps = require('gulp-sourcemaps');
const groupMedia = require('gulp-group-css-media-queries');

// Server/utils
const server = require('gulp-server-livereload');
const clean = require('gulp-clean');
const fs = require('fs');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const changed = require('gulp-changed');

// JS
const webpack = require('webpack-stream');
const babel = require('gulp-babel');

// Images
const imagemin = require('gulp-imagemin');
const imageminWebp = require('imagemin-webp');
const rename = require('gulp-rename');

// SVG
const svgsprite = require('gulp-svg-sprite');

// ------------------ COMMON ------------------
gulp.task('clean:docs', function(done) {
  if (fs.existsSync('./docs/')) {
    return gulp.src('./docs/', { read: false }).pipe(clean({ force: true }));
  }
  done();
});

const fileIncludeSetting = { prefix: '@@', basepath: '@file' };

const plumberNotify = title => ({
  errorHandler: notify.onError({
    title,
    message: 'Error <%= error.message %>',
    sound: false,
  }),
});

// ------------------ HTML ------------------
gulp.task('html:docs', function() {
  return (
    gulp
      .src([
        './src/html/**/*.html',
        '!./**/blocks/**/*.*',
        '!./src/html/docs/**/*.*',
      ])
      .pipe(changed('./docs/'))
      .pipe(plumber(plumberNotify('HTML')))
      .pipe(fileInclude(fileIncludeSetting))

      // нормализуем относительные пути
      .pipe(
        replace(
          /(?<=src=|href=|srcset=)(['"])(\.(\.)?\/)*(img|images|fonts|css|scss|sass|js|files|audio|video)(\/[^\/'"]+(\/))?([^'"]*)\1/gi,
          '$1./$4$5$7$1'
        )
      )

      // вставляем <picture> с webp (retina @2x поддерживается)
      .pipe(
        webpHTML({
          extensions: ['jpg', 'jpeg', 'png', 'gif'],
          retina: { 1: '', 2: '@2x' },
        })
      )

      // исправление кривых путей после webpHTML
      .pipe(
        replace(
          /(\bimg|images)\/([^\/]+)\.webp\/([^"'\s)]+\.webp)/g,
          '$1/$2/$3'
        )
      )

      // жёстко заменяем расширения на webp (убираем fallback на jpg)
      .pipe(replace(/\.(jpg|jpeg|png|gif)/gi, '.webp'))

      // чистим и форматируем
      .pipe(htmlclean())
      .pipe(
        prettier({
          tabWidth: 2,
          useTabs: false,
          printWidth: 160,
          trailingComma: 'es5',
          bracketSpacing: true,
        })
      )
      .pipe(gulp.dest('./docs/'))
  );
});

// ------------------ STYLES ------------------
gulp.task('sass:docs', function() {
  return (
    gulp
      .src('./src/scss/*.scss')
      .pipe(changed('./docs/css/'))
      .pipe(plumber(plumberNotify('SCSS')))
      .pipe(sourceMaps.init())
      .pipe(sassGlob())
      .pipe(sass())
      .pipe(autoprefixer())
      .pipe(groupMedia())
      // заменяем url(...) на webp в CSS (плагин создаёт дубли с webp и фолбэком)
      .pipe(
        webImagesCSS({
          mode: 'webp',
          // extensions: ['.jpg', '.jpeg', '.png'], // при необходимости ограничить
        })
      )
      // фиксим относительные пути, если нужно
      .pipe(
        replace(
          /(['"]?)(\.\.\/)+(img|images|fonts|css|scss|sass|js|files|audio|video)(\/[^\/'"]+(\/))?([^'"]*)\1/gi,
          '$1$2$3$4$6$1'
        )
      )
      .pipe(csso())
      .pipe(sourceMaps.write())
      .pipe(gulp.dest('./docs/css/'))
  );
});

// ------------------ IMAGES ------------------
// ВАЖНО: сначала генерим .webp из растров, затем копируем все оригиналы.
gulp.task('images:docs', function() {
  return (
    gulp
      // 1) .webp из растров
      .src(['./src/img/**/*.{jpg,jpeg,png,gif}', '!./src/img/svgicons/**/*'])
      .pipe(changed('./docs/img/', { extension: '.webp' }))
      .pipe(imagemin([imageminWebp({ quality: 85 })]))
      .pipe(rename({ extname: '.webp' }))
      .pipe(gulp.dest('./docs/img/'))

      // 2) копируем оригиналы (включая svg) как есть и/или с оптимизацией
      .pipe(gulp.src(['./src/img/**/*', '!./src/img/svgicons/**/*']))
      .pipe(changed('./docs/img/'))
      .pipe(
        imagemin(
          [
            imagemin.gifsicle({ interlaced: true }),
            imagemin.mozjpeg({ quality: 85, progressive: true }),
            imagemin.optipng({ optimizationLevel: 5 }),
          ],
          { verbose: true }
        )
      )
      .pipe(gulp.dest('./docs/img/'))
  );
});

// ------------------ SVG SPRITES ------------------
const svgStack = {
  mode: { stack: { example: true } },
};

const svgSymbol = {
  mode: { symbol: { sprite: '../sprite.symbol.svg' } },
  shape: {
    transform: [
      {
        svgo: {
          plugins: [
            { name: 'removeAttrs', params: { attrs: '(fill|stroke)' } },
          ],
        },
      },
    ],
  },
};

gulp.task('svgStack:docs', function() {
  return gulp
    .src('./src/img/svgicons/**/*.svg')
    .pipe(plumber(plumberNotify('SVG:stack')))
    .pipe(svgsprite(svgStack))
    .pipe(gulp.dest('./docs/img/svgsprite/'));
});

gulp.task('svgSymbol:docs', function() {
  return gulp
    .src('./src/img/svgicons/**/*.svg')
    .pipe(plumber(plumberNotify('SVG:symbol')))
    .pipe(svgsprite(svgSymbol))
    .pipe(gulp.dest('./docs/img/svgsprite/'));
});

// ------------------ FILES ------------------
gulp.task('files:docs', function() {
  return gulp
    .src('./src/files/**/*')
    .pipe(changed('./docs/files/'))
    .pipe(gulp.dest('./docs/files/'));
});

// ------------------ JS ------------------
gulp.task('js:docs', function() {
  return gulp
    .src('./src/js/*.js')
    .pipe(changed('./docs/js/'))
    .pipe(plumber(plumberNotify('JS')))
    .pipe(babel())
    .pipe(webpack(require('./../webpack.config.js')))
    .pipe(gulp.dest('./docs/js/'));
});

// ------------------ SERVER ------------------
const serverOptions = { livereload: true, open: true };
gulp.task('server:docs', function() {
  return gulp.src('./docs/').pipe(server(serverOptions));
});
