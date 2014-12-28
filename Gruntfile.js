module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    traceur: {
      options: {
        experimental: true,
        modules: "amd",
        moduleNames: false,
        types: true,
        typeAssertions: true,
        typeAssertionModule: "assert"
      },
      build: {
        files: [{
          expand: true,
          cwd: 'src',
          src: ['**/*.js'],
          dest: 'dist'
        }]
      },
    },
    watch: {
      files: "src/**/*.js",
      tasks: "traceur"
    }
  });

  // Load the "traceur" task
  grunt.loadNpmTasks('grunt-traceur');

  // Load the "watch" task
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default task(s)
  grunt.registerTask('default', ['traceur']);
};
