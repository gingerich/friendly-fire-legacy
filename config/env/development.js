
/**
 * Expose
 */

module.exports = {
  root_url: 'localhost:3000',
  db: 'mongodb://localhost/friendly-fire',
  redis: 'redis://localhost:6379',
  jwtSecret: 'dHdpc3QgYW5kIHNob3V0IQ',
  facebook: {
    clientID: 'APP_ID',
    clientSecret: 'SECRET',
    callbackURL: 'http://localhost:3000/auth/facebook/callback',
    scope: [
      'email',
      'user_about_me',
      'user_friends'
    ]
  },
  google: {
    clientID: 'APP_ID',
    clientSecret: 'SECRET',
    callbackURL: 'http://localhost:3000/auth/google/callback',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.google.com/m8/feeds',
    ]
  }
};
