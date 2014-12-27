module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    traceur: {
      options: {
        experimental: true,
        modules: "amd",
        moduleNames: false
      },
      build: {
        files: [{
          expand: true,
          cwd: 'src',
          src: ['**/*.js'],
          dest: 'dist'
        }]
      },
    }
  });

  // Load the the "traceur" task.
  grunt.loadNpmTasks('grunt-traceur');

  // Default task(s).
  grunt.registerTask('default', ['traceur']);
};
