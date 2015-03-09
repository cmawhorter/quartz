module.exports = {
  options: {
    banner: '<%= banner %>',
    stripBanners: true
  },
  dist: {
    src: ['tmp/<%= pkg.name.replace(/.js$/, "") %>.js'],
    dest: 'dist/<%= pkg.name.replace(/.js$/, "") %>.js'
  }
};
