module.exports = (options) => ({
  ...options,
  externals: [
    ({ request }, callback) => {
      if (!request) return callback();
      if (/^@hsm\//.test(request)) return callback();
      if (/^[./]/.test(request)) return callback();
      return callback(null, `commonjs ${request}`);
    },
  ],
});
