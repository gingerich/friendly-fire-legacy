/**
 * Module dependencies.
 */

var ENV = process.env.NODE_ENV || 'development';
var csrf = require('csurf');
var mongoose = require('mongoose');

/**
 * Expose
 */

module.exports = function (app, passport) {
  // Mount API routes
  var api = require('./routes/api.js')(passport);
  app.use('/api', api);

  // Mount front-end routes
  var views = require('./routes/views.js')(passport);
  app.use('/', views);

  // adds CSRF support
  if (ENV !== 'test') {
    views.use(csrf());

    // This could be moved to view-helpers :-)
    views.use(function (req, res, next) {
      res.locals.csrf_token = req.csrfToken();
      next();
    });
  }

  /**
   * Error handling
   */

  views.use(function (err, req, res, next) {
    // treat as 404
    if (err.message
      && (~err.message.indexOf('not found')
      || (~err.message.indexOf('Cast to ObjectId failed')))) {
      return next();
    }
    console.error(err.stack);
    // error page
    res.status(500).render('500', { error: err.stack });
  });

  // assume 404 since no middleware responded
  views.use(function (req, res, next) {
    res.status(404).render('404', {
      url: req.originalUrl,
      error: 'Not found'
    });
  });
};
