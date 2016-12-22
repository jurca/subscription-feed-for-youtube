
const babelify = require('babelify')
const browserify = require('browserify')
const change = require('gulp-change')
const gulp = require('gulp')
const babel = require('gulp-babel')
const source = require('vinyl-source-stream')

exports.default = gulp.series(
  compile,
  bundle,
  fixAsync
)

function compile() {
  return gulp
      .src('./src/**/*.js')
      .pipe(change((content) => {
        let result = ''
        let withinComment = false
        for (let i = 0; i < content.length; i++) {
          let char = content.charAt(i)
          if (withinComment) {
            result += char
            if ((char === '*') && (content.charAt(i + 1) === '/')) {
              i++
              withinComment = false
              result += '/'
            }
            continue
          }

          switch (char) {
            case '/':
              if (content.charAt(i + 1) === '*') {
                withinComment = true
              }
              break
            case 'a':
              if (['sync ', 'wait '].includes(content.substring(i + 1, i + 6))) {
                result += `/*a${content.substring(i + 1, i + 5)}*/`
                i += 4
                continue
              }
              break
          }
          result += char
        }
        return result
      }))
      .pipe(babel())
      .pipe(gulp.dest('./tmp'))
}

function bundle(done) {
  const FILES = [
    { in: 'tmp/background/bootstrap.js', out: 'background.js' },
    { in: 'tmp/options/bootstrap.js', out: 'options.js' }
  ]

  let subTasks = []
  for (let file of FILES) {
    subTasks.push(() =>
        browserify({
          entries: file.in,
          transform: [babelify]
        })
            .bundle()
            .pipe(source(file.out))
            .pipe(gulp.dest('./dist'))
    )
  }

  gulp.series(
    gulp.parallel(...subTasks),
    (done2) => { done(); done2() }
  )()
}

function fixAsync() {
  return gulp.src('./dist/*.js')
      .pipe(change((content) => {
        return content.replace(/\/\*a(sync|wait)\*\//g, 'a$1 ')
      }))
      .pipe(gulp.dest('./dist'))
}
