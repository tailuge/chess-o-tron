var gulp = require('gulp');
//var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var watchify = require('watchify');
var babel = require('babelify');
var to5ify = require('6to5ify');
var uglify = require('gulp-uglify');

function compile(watch) {
  var bundler = watchify(browserify('./src/main.js', { debug: true }).transform(babel).transform(to5ify));

  function rebundle() {
    bundler.bundle()
      .on('error', function(err) { console.error(err); this.emit('end'); })
      .pipe(source('app-quiz.js'))
      .pipe(buffer())
      .pipe(uglify())
      .pipe(gulp.dest('../public/compiled/'));
  }

  if (watch) {
    bundler.on('update', function() {
      console.log('-> bundling...');
      rebundle();
    });
  }

  rebundle();
}

function watch() {
  return compile(true);
};

gulp.task('build', function() { return compile(); });
gulp.task('watch', function() { return watch(); });

gulp.task('default', ['watch']);

