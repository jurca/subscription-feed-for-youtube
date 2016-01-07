module.exports = (grunt) => {
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),

    browserify: {
      dist: {
        files: {
          "dist/background.js": ["src/background/bootstrap.js"]
        },
        options: {
          transform: [["babelify", {
            plugins: [
              "transform-es2015-modules-commonjs"
            ]
          }]]
        }
      }
    },

    watch: {
      files: "src/**/*.js",
      tasks: "browserify"
    }
  })

  require("load-grunt-tasks")(grunt)

  // Default task(s)
  grunt.registerTask("default", ["browserify"])
}
