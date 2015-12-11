module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
        uses_defaults: ['**/*.js','!node_modules/**']
    },
    express: {
        options: {
            script: 'app.js'
        },
        dev: {
            options: {
                node_env: 'development'
            }
        }
    },
    watch: {
        scripts: {
            files: ['**/*.js','**/*.json','**/*.jade'],
            tasks: ['jshint','express:dev'],
            options: {
                spawn: false
            },
        }
    },
    env : {
        dev : {
              NODE_ENV : 'development',
              CONFDIR:'../config/local'
        }
    }
  });

//Load Plugin
grunt.loadNpmTasks('grunt-npm-install');
grunt.loadNpmTasks('grunt-contrib-clean');
grunt.loadNpmTasks('grunt-express-server');
grunt.loadNpmTasks('grunt-contrib-jshint');
grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-env');

//Task List
grunt.registerTask('build', ['npm-install']);
grunt.registerTask('test', ['jshint']);
grunt.registerTask('serve',['stop','build','jshint','env:dev','express:dev','watch']);
grunt.registerTask('stop',['express:dev:stop']);
grunt.registerTask('default',['serve']);

};