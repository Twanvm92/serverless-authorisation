const chai = require('chai');
const chai_http = require('chai-http');
const server = require('../../index');
const expect = chai.expect;
const assert = chai.assert;
const bcrypt = require('bcryptjs');
const session = require('../../db/neo4j');
const auth = require('../../auth/token');
const User = require('../../models/user');

chai.use(chai_http);

describe('User registration', () => {
  let credentials = {
    email: 'test@test11.com',
    password: 'test1234',
    firstname: '22131tester1,',
    lastname: 'testing',
    birth: 1993 - 6 - 24,
    gender: 'male',
    address: {
      street: 'Hinderstraat',
      number: 1,
      postal_code: '3077DA',
      city: 'Rotterdam',
      state: 'Zuid-Holland',
      country: 'Nederland',
      geometry: {
        coordinates: [4.567827, 51.886838]
      }
    }
  };

  it('Valid registration', (done) => {
    chai.request(server)
      .post('/api/v1/register')
      .send(credentials)
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(201);
        expect(res.body).to.include({"msg": "User successfully created"});

        User.findOne({email: 'test@test11.com'})
          .then((user) => {
            assert(user.firstname === '22131tester1,');

            session
              .run(
                "MATCH (user:User) RETURN user"
              )
              .then((result) => {
                assert(result.records.length === 1);
                session.close();
                done();
              });
          });

      });
  });

  it('User already exists', (done) => {
    User.create(credentials).then(() => {
      chai.request(server)
        .post('/api/v1/register')
        .send(credentials)
        .end((err, res) => {
          expect(err).to.not.be.null;
          expect(res).to.have.status(409);
          expect(res.body).to.include({error: "User already exists"});
          done();
        });
    });
  });

  it('No information given', (done) => {
    chai.request(server)
      .post('/api/v1/register')
      .end((err, res) => {
        expect(err).to.not.be.null;
        expect(res).to.have.status(400);
        expect(res.body).to.include({error: "Invalid Registration Credentials"});
        done();
      });
  })
});

describe('User login', () => {
  const credentials = {
    email: 'test@test.com',
    password: 'test1234',
    firstname: '22131tester1,',
    lastname: 'testing',
    birth: 1993 - 6 - 24,
    gender: 'male',
    address: {
      street: 'Hinderstraat',
      number: 1,
      postal_code: '3077DA',
      city: 'Rotterdam',
      state: 'Zuid-Holland',
      country: 'Nederland',
      geometry: {
        coordinates: [4.567827, 51.886838]
      }
    }
  };

  beforeEach((done) => {
    const testUser = new User({
      email: 'test@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    testUser.save().then(() => done());
  });

  it('Valid login', (done) => {
    chai.request(server)
      .post('/api/v1/login')
      .send(credentials)
      .end((err, res) => {
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        done();
      });
  });

  it('Invalid password', function (done) {
    chai.request(server)
      .post('/api/v1/login')
      .send({email: credentials.email, password: 'test'})
      .end((err, res) => {
        expect(err).to.not.be.null;
        expect(res).to.have.status(401);
        expect(res.body).to.include({"error": "Invalid password"});
        done();
      });
  });

  it('Invalid email', function (done) {
    chai.request(server)
      .post('/api/v1/login')
      .send({email: "invalid@hotmail.com", password: credentials.password})
      .end((err, res) => {
        expect(err).to.not.be.null;
        expect(res).to.have.status(404);
        expect(res.body).to.include({"error": "User not found"});
        done();
      });
  });

  it('No email and password', function (done) {
    chai.request(server)
      .post('/api/v1/login')
      .end((err, res) => {
        expect(err).to.not.be.null;
        expect(res).to.have.status(400);
        expect(res.body).to.include({error: "Invalid Login Credentials"});
        done();
      });
  });
});

describe('Retrieving user', () => {

  it('Retrieves the current authenticated user', (done) => {
    const testUser = new User({
      email: 'test@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    User.create(testUser)
      .then((userDb) => {
        auth.encodeToken(userDb).catch((err) => next(err)).then((accessToken) => {
          chai.request(server)
            .get(`/api/v1/profile`)
            .set({Authorization: `Bearer ${accessToken}`})
            .end((err, res) => {
              expect(err).to.be.null;
              expect(res).to.have.status(200);
              expect(res.body).to.be.a('object');
              expect(res.body).to.include({email: 'test@test.com'});
              expect(res.body._id.toString()).to.equal(userDb._id.toString());
              done();
            });
        });
      });
  });

  it('Retrieving multiple users', (done) => {
    const testUser1 = new User({
      email: 'test@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    const testUser2 = new User({
      email: 'SecondTestEmail@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    User.create(testUser1).then(() => {
      User.create(testUser2)
        .then((userDb) => {
          auth.encodeToken(userDb).catch((err) => next(err)).then((accessToken) => {
            chai.request(server)
              .get(`/api/v1/users`)
              .set({Authorization: `Bearer ${accessToken}`})
              .end((err, res) => {
                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res.body).to.be.a('array').and.have.lengthOf(1); //returns all users except authenticated user
                expect(res.body[0]).to.include({email: `${testUser1.email}`});
                done();
              });
          });
        });
    });
  });
});

describe('Modifying user', () => {

  it('Updating existing user', (done) => {
    let testUser = new User({
      email: 'test@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    User.create(testUser)
      .then((userDb) => {
        auth.encodeToken(userDb).catch((err) => next(err)).then((accessToken) => {
          userDb.firstname = "UpdatedName";
          chai.request(server)
            .put(`/api/v1/users`)
            .send(userDb)
            .set({Authorization: `Bearer ${accessToken}`})
            .end((err, res) => {
              expect(err).to.be.null;
              expect(res).to.have.status(202);
              expect(res.body).to.include({firstname: 'UpdatedName'});
              done();
            });
        });
      });
  });

  it('Deleting existing user', (done) => {
    const testUser = new User({
      email: 'test@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    User.create(testUser)
      .then((userDb) => {
        auth.encodeToken(userDb).catch((err) => next(err)).then((accessToken) => {
          chai.request(server)
            .delete(`/api/v1/users`)
            .send(userDb)
            .set({Authorization: `Bearer ${accessToken}`})
            .end((err, res) => {
              expect(err).to.be.null;
              expect(res).to.have.status(200);

              User.findOne({email: 'test1@test11.com'})
                .then((user) => {
                  expect(user).to.be.null;
                  session
                    .run(
                      "MATCH (user:User) RETURN user"
                    )
                    .then((result) => {
                      session.close();
                      expect(result.records).have.lengthOf(0);

                      done();
                    });
                });
            });
        });
      });
  });

  it('Updating password', (done) => {
    const testUser = new User({
      email: 'test@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    User.create(testUser)
      .then((userDb) => {
        auth.encodeToken(userDb).catch((err) => next(err)).then((accessToken) => {
          chai.request(server)
            .put(`/api/v1/changePassword`)
            .send({oldPassword: 'test1234', newPassword: 'test'})
            .set({Authorization: `Bearer ${accessToken}`})
            .end((err, res) => {
              expect(err).to.be.null;
              expect(res).to.have.status(200);
              expect(res.body.token).to.be.a('string');
              expect(res.body.token).to.equal(accessToken);
              done();
            });
        });
      });
  });
});

describe('Friendship relation', () => {

  it('Adds a friend to the current authenticated user', (done) => {
    const testUser1 = new User({
      email: 'test@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    const testUser2 = new User({
      email: 'SecondTestEmail@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    User.create(testUser1).then((userDb1) => {
      User.create(testUser2).then((userDb2) => {
        auth.encodeToken(userDb2).catch((err) => next(err)).then((accessToken) => {
          chai.request(server)
            .post(`/api/v1/friends/${userDb1._id}`)
            .set({Authorization: `Bearer ${accessToken}`})
            .end((err, res) => {
              expect(err).to.be.null;
              expect(res).to.have.status(200);
              expect(res.body).to.include({msg: "Friendship relation successfully created"});
              done();
            });
        });
      });
    });
  });

  it('Removes a friend from the current authenticated user', (done) => {
    const testUser1 = new User({
      email: 'test@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    const testUser2 = new User({
      email: 'SecondTestEmail@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    User.create(testUser1).then((userDb1) => {
      User.create(testUser2).then((userDb2) => {
        auth.encodeToken(userDb1).catch((err) => next(err)).then((accessToken) => {
          session.run(
            'CREATE (u1:User {id: {id1}})' +
            'CREATE (u2:User {id: {id2}})' +
            'CREATE (u1)-[:FRIENDS_WITH]->(u2)',
            {id1: userDb1._id.toString(), id2: userDb2._id.toString()}).then(() => {
            session.close();
          }).then(() => {
            chai.request(server)
              .del(`/api/v1/friends/${userDb1._id}`)
              .set({Authorization: `Bearer ${accessToken}`})
              .end((err, res) => {

                expect(err).to.be.null;
                expect(res).to.have.status(200);
                expect(res.body).to.include({msg: "Friendship relation successfully removed"});
                done();
              });
          });
        });
      });
    });
  });

  it('Gets all users with a friendship relation with the authenticated user', (done) => {
    const testUser1 = new User({
      email: 'test@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    const testUser2 = new User({
      email: 'SecondTestEmail@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    const testUser3 = new User({
      email: 'SecondTestEmail@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    User.create(testUser1).then((userDb1) => {
      User.create(testUser2).then((userDb2) => {
        User.create(testUser3).then((userDb3) => {
          auth.encodeToken(userDb1).catch((err) => next(err)).then((accessToken) => {

            session.run(
              'CREATE (u1:User {id: {id1}})' +
              'CREATE (u2:User {id: {id2}})' +
              'CREATE (u3:User {id: {id3}})' +
              'CREATE (u1)-[:FRIENDS_WITH]->(u2)' +
              'CREATE (u1)-[:FRIENDS_WITH]->(u3)',
              {id1: userDb1._id.toString(), id2: userDb2._id.toString(), id3: userDb3._id.toString()}).then(() => {
              session.close();
            }).then(() => {
              chai.request(server)
                .get(`/api/v1/friends`)
                .set({Authorization: `Bearer ${accessToken}`})
                .end((err, res) => {

                  expect(err).to.be.null;
                  expect(res).to.have.status(200);
                  expect(res.body).to.be.a('array').and.have.lengthOf(2);
                  done();
                });
            });
          });
        });
      });
    });
  });

  it('Gets all users with a friendship relation with the submitted user', (done) => {
    const testUser1 = new User({
      email: 'test@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    const testUser2 = new User({
      email: 'SecondTestEmail@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    const testUser3 = new User({
      email: 'SecondTestEmail@test.com',
      password: bcrypt.hashSync('test1234'),
      firstname: '22131tester1,',
      lastname: 'testing',
      birth: 1993 - 6 - 24,
      gender: 'male',
      address: {
        street: 'Hinderstraat',
        number: 1,
        postal_code: '3077DA',
        city: 'Rotterdam',
        state: 'Zuid-Holland',
        country: 'Nederland',
        geometry: {
          coordinates: [4.567827, 51.886838]
        }
      }
    });

    User.create(testUser1).then((userDb1) => {
      User.create(testUser2).then((userDb2) => {
        User.create(testUser3).then((userDb3) => {
          auth.encodeToken(userDb1).catch((err) => next(err)).then((accessToken) => {

            session.run(
              'CREATE (u1:User {id: {id1}})' +
              'CREATE (u2:User {id: {id2}})' +
              'CREATE (u3:User {id: {id3}})' +
              'CREATE (u2)-[:FRIENDS_WITH]->(u1)' +
              'CREATE (u2)-[:FRIENDS_WITH]->(u3)',
              {id1: userDb1._id.toString(), id2: userDb2._id.toString(), id3: userDb3._id.toString()}).then(() => {
              session.close();
            }).then(() => {
              chai.request(server)
                .get(`/api/v1/users/${userDb2._id}/friends`)
                .set({Authorization: `Bearer ${accessToken}`})
                .end((err, res) => {

                  expect(err).to.be.null;
                  expect(res).to.have.status(200);
                  expect(res.body).to.be.a('array').and.have.lengthOf(1);
                  done();
                });
            });
          });
        });
      });
    });
  });
});