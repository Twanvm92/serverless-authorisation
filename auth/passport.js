const passport = require('passport');
const passport_jwt = require('passport-jwt');
const User = require('../models/user');

const env = require('../config/env');

const JwtStrategy = passport_jwt.Strategy;
const ExtractJwt = passport_jwt.ExtractJwt;

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: env.secretkey
};

passport.use(new JwtStrategy(options, (payload, done) => {
  User.findById(payload.sub).catch((err) => done(err, false)).then((user) => {

    if(user) {
      passport.userId = payload.sub;
      done(null, user);
    } else {
      done(null, false);
    }
  });
}));

module.exports = passport;
