// middleware/logger.js
  function logger(req, res, next) {
    const start = Date.now();
    const { method, path, ip } = req;

    res.on('finish', () => {
      const ms     = Date.now() - start;
      const status = res.statusCode;
      const color  = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m'
   : '\x1b[32m';
      console.log(`${color}[${new Date().toISOString()}] ${method} ${path} →
   ${status} (${ms}ms) — ${ip}\x1b[0m`);
    });

    next();
  }

  module.exports = logger;