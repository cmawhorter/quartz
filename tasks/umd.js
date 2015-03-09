module.exports = {
  lib: {
    template: 'umd',
    indent: '  ',
    src: 'tmp/<%= pkg.name.replace(/.js$/, "") %>.js',
    dest: 'dist/<%= pkg.name.replace(/.js$/, "") %>.js',
    returnExportsGlobal: 'quartz',
    deps: {
      default: [],
      amd: [],
      cjs: [],
      global: []
    }
  }
};
