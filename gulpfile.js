let path = {

    src: 'app/src/', dev: 'app/dev/', devAssets: 'app/dev/assets/', dist: 'app/dist/', distAssets: 'app/dist/assets/',

};

let config = {

    htmlStyle: 'html', // html|pug
    env: 'dev', // dev|prod
    deploy: {

        type: 'ftp', // ftp|ssh - реализация ssh в планах
        ftp: {
            user: "", // Password optional, prompted if none given
            password: "",
            host: "",
            port: 21,
            localRoot: path.dist,
            remoteRoot: "/test/", // include: ["*", "**/*"],      // this would upload everything except dot files
            // include: ["*.php", "dist/*", ".*"],
            include: ["*", "**/*"], // e.g. exclude sourcemaps, and ALL files in node_modules (including dot files)
            // exclude: ["dist/**/*.map", "node_modules/**", "node_modules/**/.*", ".git/**"],
            // delete ALL existing files at destination before uploading, if true
            deleteRemote: false, // Passive mode is forced (EPSV command is not sent)
            forcePasv: true, // use sftp or ftp
            sftp: false

        }

    }

};

const gulp = require('gulp');
const clean = require('del');
const rigger = require('gulp-rigger');
const rename = require('gulp-rename');
const browserSync = require('browser-sync').create();
const dev_ip = require('dev-ip');

const FtpDeploy = require("ftp-deploy");
const ftpDeploy = new FtpDeploy();

const html_include = require('gulp-file-include');
const pug = require('gulp-pug');
const sass = require('gulp-sass')(require('sass'));
const clean_css = require('gulp-clean-css');
const autoprefixer = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');

const htmlTask = () => {

    if (config.htmlStyle === 'html') {

        if (config.env === 'dev') {
            return gulp.src([path.src + 'html/**/*.html', '!' + path.src + 'html/components/**/*.html'])
                .pipe(html_include({
                    prefix: '@@',
                    basepath: '@file'
                }))
                .pipe(gulp.dest(path.dev))
                .pipe(browserSync.stream());
        } else if (config.env === 'prod') {
            return gulp.src([path.src + 'html/**/*.html', '!' + path.src + 'html/components/**/*.html'])
                .pipe(html_include({
                    prefix: '@@',
                    basepath: '@file'
                }))
                .pipe(gulp.dest(path.dist))
        }

    } else if (config.htmlStyle === 'pug') {

        if (config.env === 'dev') {
            return gulp.src(path.src + 'pug/*.pug')
                .pipe(pug({pretty: true}))
                .pipe(gulp.dest(path.dev))
                .pipe(browserSync.stream());
        } else if (config.env === 'prod') {
            return gulp.src(path.src + 'pug/*.pug')
                .pipe(pug({pretty: true}))
                .pipe(gulp.dest(path.dist))
        }

    }

};

exports.htmlTask = htmlTask;


const sassTask = () => {
    if (config.env === 'dev') {
        return gulp.src(path.src + 'sass/*.*')
            .pipe(sourcemaps.init())
            .pipe(sass({outputStyle: 'expanded'}))
            .pipe(autoprefixer({overrideBrowserslist: ['last 10 versions'], grid: true}))
            .pipe(sourcemaps.write())
            .pipe(gulp.dest(path.devAssets + 'css/'))
            .pipe(browserSync.stream());
    } else if (config.env === 'prod') {
        return gulp.src(path.src + 'sass/*.*') // собираем все SASS файлы, в один файл
            //.pipe(rename({suffix: '.min'})) // добавляем префикс .min к названию всех файлов
            .pipe(sass()) // компилируем
            .pipe(autoprefixer({
                overrideBrowserslist: ['last 10 versions'], grid: true
            }))
            .pipe(clean_css({
                debug: true, level: 2
            }, (details) => {
                console.log(`Файл ${details.name} сжат на ${details.stats.originalSize - details.stats.minifiedSize} байт. Итог: ${details.stats.minifiedSize} байт.`);
            }))
            .pipe(gulp.dest(path.distAssets + 'css/'))
    }

};

exports.sassTask = sassTask;

const jsTask = () => {
    if (config.env === 'dev') {
        return gulp.src(path.src + 'js/*.js')
            .pipe(babel())
            .pipe(rigger())
            .pipe(gulp.dest(path.devAssets + 'js/'))
            .pipe(browserSync.stream());
    } else if (config.env === 'prod') {
        return gulp.src(path.src + 'js/*.js')
            .pipe(babel())
            .pipe(rigger())
            .pipe(uglify())
            .pipe(gulp.dest(path.distAssets + 'js/'))
    }

};

exports.jsTask = jsTask;

const fontsTask = () => {
    if (config.env === 'dev') {
        return gulp.src(path.src + 'fonts/*.*')
            .pipe(gulp.dest(path.devAssets + 'fonts/'))
            .pipe(browserSync.stream());
    } else if (config.env === 'prod') {
        return gulp.src(path.src + 'fonts/*.*')
            .pipe(gulp.dest(path.distAssets + 'fonts/'))
    }

};

exports.fontsTask = fontsTask;

const imagesTask = () => {
    if (config.env === 'dev') {
        return gulp.src(path.src + 'img/**/*.*')
            .pipe(gulp.dest(path.devAssets + 'img/'))
            .pipe(browserSync.stream());
    } else if (config.env === 'prod') {
        return gulp.src(path.src + 'img/**/*.*')
            .pipe(gulp.dest(path.distAssets + 'img/'))
    }

};

exports.imagesTask = imagesTask;

const browserSyncTask = () => {
    browserSync.init({
        server: {
            baseDir: path.dev
        }, online: true, host: dev_ip()
    });
};

exports.browserSyncTask = browserSyncTask;

const watchTask = () => {
    gulp.watch(path.src + 'pug/**/*.pug', htmlTask);
    gulp.watch(path.src + 'html/**/*.html', htmlTask);
    gulp.watch(path.src + 'sass/**/*.scss', sassTask);
    gulp.watch(path.src + 'js/**/*.js', jsTask);
    gulp.watch(path.src + 'fonts/**/*.*', fontsTask);
    gulp.watch(path.src + 'img/**/*.*', imagesTask);
};

exports.watchTask = watchTask;


const runClean = () => {
    if (config.env === 'dev') {
        return clean([path.dev]);
    } else if (config.env === 'prod') {
        return clean([path.dist]);
    }
};

exports.runClean = runClean;


const runDeploy = (done) => {

    ftpDeploy
        .deploy(config.deploy.ftp)
        .then(res => console.log("finished:", res))
        .catch(err => console.log(err));

    done();

};

exports.runDeploy = runDeploy;


const setDevEnv = (cb) => {
    config.env = 'dev';
    cb();
};

exports.setDevEnv = setDevEnv;


const setDistEnv = (cb) => {
    config.env = 'prod';
    cb();
};

exports.setDistEnv = setDistEnv;

exports.default = gulp.series(setDevEnv, runClean,

    gulp.parallel(sassTask, jsTask, fontsTask, imagesTask, htmlTask, watchTask, browserSyncTask));

exports.dist = gulp.series(setDistEnv, runClean,

    sassTask, jsTask, fontsTask, imagesTask, htmlTask,);

exports.dep = gulp.series(setDistEnv, runClean,

    sassTask, jsTask, fontsTask, imagesTask, htmlTask,

    runDeploy,);
