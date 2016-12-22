
const babelify = require('babelify')
const browserify = require('browserify')
const change = require('gulp-change')
const gulp = require('gulp')
const babel = require('gulp-babel')
const source = require('vinyl-source-stream')

exports.default = gulp.series(
  compile,
  bundle
)

function compile() {
  return gulp
      .src('./src/**/*.js')
      .pipe(babel())
      /*.pipe(change((content) => {
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
              if (['sync', 'wait'].includes(content.substring(i + 1, i + 5))) {
                result += `/*a${content.substring(i + 1, i + 5)}*//*`
                i += 4
                continue
              }
              break
          }
          result += char
        }
        return result
        return content
            .replace(/async /g, '/*async *//*')
            .replace(/await /g, '/*await *//*')
      }))*/
      .pipe(gulp.dest('./tmp'))
}

function bundle() {
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

  return gulp.parallel(...subTasks)()
}
