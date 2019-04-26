const express = require('express');
const router = express.Router();
const passport = require('../auth/passport');

const user = require('../controllers/user');


router.get('/test', user.test);
// router.post('/register', user.register);
// router.post('/login', user.login);

//
// router.all('*', passport.authenticate('jwt', { session: false }));
//
// //User profile endpoints
// router.get('/profile', user.profile);
// router.put('/users', user.update);
// router.delete('/users', user.delete);

// //Get other users
// router.get('/users/:id/friends', user.getUserFriends);
// router.get('/users/:id?', user.read)

module.exports = router;

