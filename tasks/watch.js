module.exports = {
  lib: {
    files: '<%= jshint.lib.src %>',
    tasks: [
      'build'
    ]
  },
  test: {
    files: '<%= jshint.test.src %>',
    tasks: [
      'jshint:test',
      'jscs:test',
      'lintspaces:test'
    ]
  }
};
