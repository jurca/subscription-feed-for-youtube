module.exports = (grunt) => {
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),

    browserify: {
      dist: {
        files: {
          "dist/background.js": ["src/background/bootstrap.js"],
          "dist/options.js": ["src/options/bootstrap.js"]
        },
        options: {
          transform: ["babelify"]
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
