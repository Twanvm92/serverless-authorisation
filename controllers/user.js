const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const _ = require('lodash');
const auth = require('../auth/token');
const neo4j = require('../db/neo4j');
const objectId = require('mongodb').ObjectID;
const parser = require('parse-neo4j');

const User = require('../models/user');
const passport = require('../auth/passport');

module.exports = {

  register(req, res, next) {

    let body = req.body;

    if (!_.isEmpty(body)) {
      User.findOne({email: body.email}).catch(err => next(err)).then(user => {

        if (!user) {

          bcrypt.hash(body.password, 8).catch(err => next(err)).then(hash => {
            let user = body;
            user.password = hash;
            return new User(user);
          }).then(user => {
            user.save().catch(err => next(err)).then(user => {
              neo4j.run('CREATE (u:User {id: {id}}) RETURN u', {id: user._id.toString()}).catch(err => next(err)).then(result => {
                res.status(201).json({msg: "User successfully created"});
                neo4j.close();
              })
            });
          })
        } else {
          res.status(409).json({error: "User already exists"});
        }

      });

    } else {
      res.status(400).json({error: "Invalid Registration Credentials"});
    }
  },


  login(req, res, next) {
    let email = req.body.email || '';
    let password = req.body.password || '';

    if (email != '' || password != '') {

      User.findOne({email: email}).catch((err) => next(err)).then((user) => {

        if (user) {
          bcrypt.compare(password, user.password).catch((err) => next(err)).then((valid) => {

            if (valid) {
              var token = auth.encodeToken(user).catch((err) => next(err)).then((token) => {
                res.status(200).json({token: token});
              });
            } else {
              res.status(401).json({error: "Invalid password"});
            }

          });

        } else {
          res.status(404).json({error: "User not found"});
        }

      });

    } else {
      res.status(400).json({error: "Invalid Login Credentials"});
    }
  },

  //Reading authenticated user
  profile(req, res, next) {
    res.send(req.user);
  },

  //Reading other users
  read(req, res, next) {
    const userId = req.params.id || '';
    if (userId !== '') {
      if (objectId.isValid(userId)) {
        User.findById(userId).then((user) => {
          if (user) {
            res.status(200).send(user)
          } else {
            res.status(204).json({error: "User not found"});
          }
        }).catch((err) => next(err));
      } else {
        res.status(422).json({error: "Invalid user id"});
      }
    } else {
      User.find({}).then((users) => {
        users = users.filter(user => user._id.toString() !== (req.user._id.toString()));
        res.status(200).send(users);
      }).catch((err) => next(err));
    }
  },

  //Updating a user
  update(req, res, next) {
    const userId = req.user._id;
    const user = req.body;

    if (objectId.isValid(userId) && (user._id === undefined || user._id === userId.toString())) {
      User.findByIdAndUpdate(userId, user)
        .then((userDb) => {
          if (userDb) {
            User.findById(userId).then(user => res.status(202).send(user)).catch(next);
          } else {
            res.status(204).json({error: "User not found"});
          }
        })
    } else {
      res.status(422).json({error: "Invalid user id"});
    }
  },

  //Deleting a user
  delete(req, res, next) {
    if (objectId.isValid(req.user._id)) {
      neo4j
        .run(
          "MATCH (u:User{id: {UserIdParam}})" +
          "OPTIONAL MATCH (u)-[rel]-(friend:User)" +
          "DELETE rel, u"
          , {
            UserIdParam: req.user._id.toString()
          })
        .then(() => {
          User.findByIdAndRemove(req.user._id)
            .then((userDb) => {
              if (userDb) {
                res.status(200).send(userDb);
              } else {
                res.status(204).json({error: "User not found"});
              }
            }).catch((err) => next(err));
        })
        .catch((err) => {
          if (err.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
            res.status(409).json({error: "User is connected to events"});
          } else {
            next(err);
          }
        });
    } else {
      res.status(422).json({error: "Invalid user id"});
    }
  },

  //Changing password
  changePassword(req, res, next) {
    const userId = req.user._id;
    const oldPassword = req.body.oldPassword || '';
    const newPassword = req.body.newPassword || '';

    if (oldPassword != '' || newPassword != '') {
      if (objectId.isValid(userId)) {
        User.findById(userId)
          .then((user) => {
            if (user) {
              bcrypt.compare(oldPassword, user.password).catch((err) => next(err)).then((valid) => {
                  if (valid) {
                    bcrypt.hash(newPassword, 8).catch(err => next(err)).then(hash => {
                      user.password = hash;
                      return new User(user);
                    }).then((user) => {
                      user.save().catch(err => next(err)).then(user => {
                        let token = auth.encodeToken(user).catch((err) => next(err)).then((token) => {
                          res.status(200).json({token: token});
                        });
                      });
                    });
                  } else {
                    res.status(401).json({error: "Invalid password"});
                  }
                }
              );
            } else {
              res.status(404).json({error: "User not found"});
            }
          });
      } else {
        res.status(422).json({error: "Invalid user id"});
      }
    } else {
      res.status(400).json({error: "Invalid password information"});
    }
  },

  addFriend(req, res, next) {
    const otherUser = req.params.id || '';

    if (otherUser != '' && objectId.isValid(otherUser) && objectId.isValid(req.user._id)) {
      neo4j.run("MATCH (u:User {id: {authUserIdParam}}) " +
        "MATCH (o:User {id: {otherUserIdParam}}) " +
        "MERGE (u)-[:FRIENDS_WITH]->(o) ", {
          authUserIdParam: req.user._id.toString(),
          otherUserIdParam: otherUser.toString()
        }
      ).catch(err => next(err)).then(result => {
        res.status(200).json({msg: "Friendship relation successfully created"});
        neo4j.close();
      });
    } else {
      res.status(400).json({error: "User not found"});
    }
  },

  removeFriend(req, res, next) {
    const otherUser = req.params.id || '';

    if (otherUser != '' && objectId.isValid(otherUser) && objectId.isValid(req.user._id)) {
      neo4j.run("MATCH (u:User {id: {authUserIdParam}}) " +
        "MATCH (o:User {id: {otherUserIdParam}}) " +
        "MATCH (u)-[r:FRIENDS_WITH]->(o) " +
        "DELETE r;", {
          authUserIdParam: req.user._id.toString(),
          otherUserIdParam: otherUser.toString()
        }
      ).catch(err => next(err)).then(result => {
        res.status(200).json({msg: "Friendship relation successfully removed"});
        neo4j.close();
      });
    } else {
      res.status(400).json({error: "User not found"});
    }
  },

  getFriends(req, res, next) {
    neo4j.run("MATCH (o:User) " +
      "MATCH (u:User {id: {authUserIdParam}}) " +
      "MATCH (u)-[:FRIENDS_WITH]->(o) " +
      "RETURN o;", {
        authUserIdParam: req.user._id.toString()
      }
    ).catch(err => next(err))
      .then(parser.parse)
      .then((parsed) => {

        const userIds = parsed.map((userIds) => mongoose.mongo.ObjectId(userIds.id));
        return User.find({'_id': {$in: userIds}});
      })
      .catch(err => next(err))
      .then((users) => {
        res.status(200).json(users);
        neo4j.close();
      });
  },

  getUserFriends(req, res, next) {
    const userId = req.params.id || '';
    neo4j.run("MATCH (o:User) " +
      "MATCH (u:User {id: {userIdParam}}) " +
      "MATCH (u)-[:FRIENDS_WITH]->(o) " +
      "RETURN o;", {
        userIdParam: userId
      }
    ).catch(err => next(err))
      .then(parser.parse)
      .then((parsed) => {

        const userIds = parsed.map((userIds) => mongoose.mongo.ObjectId(userIds.id));
        return User.find({'_id': {$in: userIds}});
      })
      .catch(err => next(err))
      .then((users) => {
        users = users.filter(user => user._id.toString() !== (req.user._id.toString()));
        res.status(200).json(users);
        neo4j.close();
      });
  }
};
