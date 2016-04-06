exports.promisify = function (fn) {
  return new Promise(function (res, rej) {
    fn(function (err, result) {
      if (err) return rej(err);
      res(result);
    });
  });
};
