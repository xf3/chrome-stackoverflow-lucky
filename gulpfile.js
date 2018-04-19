var gulp, sass,
    sourceDir, assetsDir;

gulp= require('gulp');
sass = require('gulp-sass');

sourceDir = __dirname + '/src';
assetsDir = __dirname + '/build';

gulp.task('sass', function () {
    gulp
        .src(sourceDir + '/sass/*.scss')
        .pipe(sass())
        .pipe(gulp.dest(assetsDir + '/css/'));
});

gulp.task('default', [
    'sass'
]);
