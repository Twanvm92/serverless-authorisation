const express = require('express');
const router = express.Router();
const passport = require('../auth/passport');

const user = require('../controllers/user');
const address = require('../controllers/address');
const sportevent = require('../controllers/sportevent');

// router.post('/register', user.register);
// router.post('/login', user.login);
// router.get('/address', address.addressMatch);
//
// router.get('/sportevents/:id?', sportevent.get);
//
//
// router.all('*', passport.authenticate('jwt', { session: false }));
//
// router.post('/sportevents', sportevent.add);
//
// router.post('/sportevents/:id/attend', sportevent.attend);
// router.post('/sportevents/:id/leave', sportevent.leave);
// router.delete('/sportevents/:id', sportevent.remove);
//
//
//
// //User profile endpoints
// router.get('/profile', user.profile);
// router.put('/users', user.update);
// router.delete('/users', user.delete);
// //Changing password
// router.put('/changePassword', user.changePassword);
// //Get other users
// router.get('/users/:id/friends', user.getUserFriends);
// router.get('/users/:id?', user.read)
// //User friends endpoints
// router.get('/friends', user.getFriends);
// router.post('/friends/:id', user.addFriend);
// router.delete('/friends/:id', user.removeFriend);

module.exports = router;

