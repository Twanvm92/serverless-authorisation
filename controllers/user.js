const bcrypt = require('bcryptjs');
const passport = require('../auth/passport');

module.exports = {

  test(req, res, next) {
    res.status(200).json({"msg": "you are authorized to see this!"});
  },

  register(req, res, next) {

    let body = req.body;

    // if (!_.isEmpty(body)) {
    //   User.findOne({email: body.email}).catch(err => next(err)).then(user => {
    //
    //     if (!user) {
    //
    //       bcrypt.hash(body.password, 8).catch(err => next(err)).then(hash => {
    //         let user = body;
    //         user.password = hash;
    //         return new User(user);
    //       }).then(user => {
    //         user.save().catch(err => next(err)).then(user => {
    //           neo4j.run('CREATE (u:User {id: {id}}) RETURN u', {id: user._id.toString()}).catch(err => next(err)).then(result => {
    //             res.status(201).json({msg: "User successfully created"});
    //             neo4j.close();
    //           })
    //         });
    //       })
    //     } else {
    //       res.status(409).json({error: "User already exists"});
    //     }
    //
    //   });
    //
    // } else {
    //   res.status(400).json({error: "Invalid Registration Credentials"});
    // }
    res.status(200);
  },


  login(req, res, next) {
    // let email = req.body.email || '';
    // let password = req.body.password || '';
    //
    // if (email != '' || password != '') {
    //
    //   User.findOne({email: email}).catch((err) => next(err)).then((user) => {
    //
    //     if (user) {
    //       bcrypt.compare(password, user.password).catch((err) => next(err)).then((valid) => {
    //
    //         if (valid) {
    //           var token = auth.encodeToken(user).catch((err) => next(err)).then((token) => {
    //             res.status(200).json({token: token});
    //           });
    //         } else {
    //           res.status(401).json({error: "Invalid password"});
    //         }
    //
    //       });
    //
    //     } else {
    //       res.status(404).json({error: "User not found"});
    //     }
    //
    //   });
    //
    // } else {
    //   res.status(400).json({error: "Invalid Login Credentials"});
    // }
    res.status(200);
  },

  //Reading other users
  read(req, res, next) {
    // const userId = req.params.id || '';
    // if (userId !== '') {
    //   if (objectId.isValid(userId)) {
    //     User.findById(userId).then((user) => {
    //       if (user) {
    //         res.status(200).send(user)
    //       } else {
    //         res.status(204).json({error: "User not found"});
    //       }
    //     }).catch((err) => next(err));
    //   } else {
    //     res.status(422).json({error: "Invalid user id"});
    //   }
    // } else {
    //   User.find({}).then((users) => {
    //     users = users.filter(user => user._id.toString() !== (req.user._id.toString()));
    //     res.status(200).send(users);
    //   }).catch((err) => next(err));
    // }
    res.status(200);
  },

  //Updating a user
  update(req, res, next) {
    // const userId = req.user._id;
    // const user = req.body;
    //
    // if (objectId.isValid(userId) && (user._id === undefined || user._id === userId.toString())) {
    //   User.findByIdAndUpdate(userId, user)
    //     .then((userDb) => {
    //       if (userDb) {
    //         User.findById(userId).then(user => res.status(202).send(user)).catch(next);
    //       } else {
    //         res.status(204).json({error: "User not found"});
    //       }
    //     })
    // } else {
    //   res.status(422).json({error: "Invalid user id"});
    // }
    res.status(200);
  },


};
