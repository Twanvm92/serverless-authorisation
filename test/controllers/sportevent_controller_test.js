const chai = require('chai');
const chai_http = require('chai-http');
const server = require('../../index');
const expect = chai.expect;
const assert = chai.assert;
const bcrypt = require('bcryptjs');
const session = require('../../db/neo4j');
const auth = require('../../auth/token');
const User = require('../../models/user');
const neo4j = require('../../db/neo4j');
const parser = require('parse-neo4j');
const _ = require('lodash');
const nock = require('nock');
const config = require('../../config/env');

chai.use(chai_http);

describe('SportEvent Controller Test', () => {
	let user1;
	let user2;
	let user3;
	
	let sportEventId = 1234;
	let token;
	let organisorId;
	
	let credentialsUser1 = {
		email: 'test@test.com',
		password: 'test1234',
	};
	
	const sporteventResponse = {
		"sportEventId": 6,
		"name": "GVoetbal",
		"minAttendees": 2,
		"maxAttendees": 20,
		"description": "Alleen mensen met een lichamelijke handicap mogen meedoen",
		"eventStartTime": "2018-01-16T14:00:00",
		"eventEndTime": "2018-01-16T15:00:00",
		"sportId": 1,
		"reservationId": 5,
	};
	
	const sporteventResponse2 = {
		"sportEventId": 7,
		"name": "GVoetbal",
		"minAttendees": 2,
		"maxAttendees": 20,
		"description": "Alleen mensen met een lichamelijke handicap mogen meedoen",
		"eventStartTime": "2018-01-16T14:00:00",
		"eventEndTime": "2018-01-16T15:00:00",
		"sportId": 2,
		"reservationId": 6,
	};
	
	const sportResponse = {
		"sportId": 1,
		"name": "Voetbal"
	};
	
	const sportResponse2 = {
		"sportId": 2,
		"name": "Basketbal"
	};
	
	const aSportevents = {
		"_embedded": {
			"sportevents": [
				sporteventResponse,
				sporteventResponse2
			]
		}
	};
	
	const reservationResponse = {
		"reservationId": 5,
		"startTime": "2018-01-16T14:00:00",
		"timeFinish": "2018-01-16T15:00:00",
		"definite": false,
		"sportEventId": 6,
		"hallId": 1,
	};
	
	const reservationResponse2 = {
		"reservationId": 6,
		"startTime": "2018-01-16T14:00:00",
		"timeFinish": "2018-01-16T15:00:00",
		"definite": false,
		"sportEventId": 7,
		"hallId": 1,
	};
	
	const hallResponse = {
		"hallId": 1,
		"name": "Hall 1",
		"size": "Groot",
		"price": 10,
		"available": true,
		"buildingId": 3,
	};
	
	const buildingResponse = {
		"buildingId": 3,
		"name": "Sport Fit",
		"address": {
			"addressId": 3,
			"streetName": "Dijkweg",
			"houseNumber": 33,
			"suffix": null,
			"zipCode": "4814CC",
			"city": "Breda",
			"state": "Noord-Brabant",
			"country": "Nederland"
		}
	};
	
	beforeEach((done) => {
		user1 = new User({
			email: credentialsUser1.email,
			password: bcrypt.hashSync(credentialsUser1.password),
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
		
		user2 = new User({
			email: 'test2@test.com',
			password: bcrypt.hashSync('test12345'),
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
		
		user3 = new User({
			email: 'thirdtestemail@test.com',
			password: bcrypt.hashSync('test1234'),
			firstname: 'testerbeepboop,',
			lastname: 'testingagain',
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
		
		User.create(user1)
			.then((result) => user1 = result)
			.then(() => User.create(user2))
			.then((result) => user2 = result)
			.then(() => User.create(user3))
			.then((result) => {
				user3 = result;
				organisorId = user3._id;
				return createUsersInNeo4j();
			})
			.then(() => {
				console.log("Users created in neo4j");
				done();
			})
			.catch((err) => console.log(`neo4j error: ${err}`));
	});
	
	function createUsersInNeo4j() {
		return session.run(`CREATE (u:User{id: "${user1._id}"}) RETURN u;`).then(() => {
			return session.run(`CREATE (u:User{id: "${user2._id}"}) RETURN u;`);
		})
	}
	
	function createEventInNeo4j() {
		return session.run(`CREATE (e:Event{id: ${sportEventId}}) RETURN e;`).then(() => {
			return session.run(`MATCH (u:User{id: "${user1._id}"}) ` +
				`MATCH (e:Event{id:${sportEventId}}) ` +
				`MERGE (e)-[:CREATED_BY]->(u) ` +
				`MERGE (u)-[:IS_ATTENDING]->(e) ` +
				`RETURN u, e;`
			);
		});
	}
	
	function neo4jallRelations() {
		return neo4j.run(
			"MERGE (attendee1:User {id: {attendee1Param}})" +
			"MERGE (e:Event {id: {eventParam}})" +
			"MERGE (e2:Event {id: {event2Param}})" +
			"MERGE (attendee1)-[:IS_ATTENDING]->(e)" +
			"MERGE (attendee1)-[:IS_ATTENDING]->(e2)" +
			"MERGE (attendee2:User {id: {attendee2Param}})-[:IS_ATTENDING]->(e)" +
			"MERGE (attendee3:User {id: {attendee3Param}})<-[:CREATED_BY]-(e)" +
			"MERGE (attendee3)<-[:CREATED_BY]-(e2)" +
			"MERGE (attendee3)-[:IS_ATTENDING]->(e)" +
			"MERGE (attendee3)-[:IS_ATTENDING]->(e2)" +
			"RETURN attendee1, attendee2, attendee3, e, e2;",
			{
				attendee1Param: user1._id.toString(),
				attendee2Param: user2._id.toString(),
				attendee3Param: user3._id.toString(),
				eventParam: sporteventResponse.sportEventId,
				event2Param: sporteventResponse2.sportEventId
			}
		).catch((err) => console.log('error: ' + err)).then(
			parser.parse
		).then((parsed) => {
			console.log("parsed test result: " + JSON.stringify(parsed));
		});
	}
	
	function mockDelete() {
		nock(config.sportunite_asp_api.host)
			.delete(`/api/sportevents/${sportEventId}`)
			.reply(200, 'SportEvent deleted')
			.log((data) => console.log("NOCK LOG: " + data));
	}
	
	function mockGet() {
		nock(config.sportunite_asp_api.host)
			.get(`/api/sportevents/${sporteventResponse.sportEventId}`)
			.reply(200, sporteventResponse)
			.get(`/api/sportevents/${sporteventResponse2.sportEventId}`)
			.reply(200, sporteventResponse2)
			.get(`/api/sports/${sportResponse.sportId}`)
			.reply(200, sportResponse)
			.get(`/api/sports/${sportResponse2.sportId}`)
			.reply(200, sportResponse2)
			.get(`/api/reservations/${reservationResponse.reservationId}`)
			.reply(200, reservationResponse)
			.get(`/api/reservations/${reservationResponse2.reservationId}`)
			.reply(200, reservationResponse2)
			.get(`/api/halls/${hallResponse.hallId}`)
			.times(2)
			.reply(200, hallResponse)
			.get(`/api/buildings/${buildingResponse.buildingId}`)
			.times(2)
			.reply(200, buildingResponse)
			.get(`/api/sportevents/`)
			.reply(200, aSportevents)
			.log((data) => console.log("NOCK LOG: " + data));
	}
	
	it('Add a SportEvent', (done) => {
		auth.encodeToken(user1)
			.catch((err) => next(err))
			.then((accessToken) => {
				token = accessToken;
				
				chai.request(server)
					.post(`/api/v1/sportevents`)
					.send({email: user1.email, eventId: sportEventId})
					.set({Authorization: `Bearer ${token}`})
					.end((err, res) => {
						expect(err).to.be.null;
						expect(res).to.have.status(201);
						
						session.run(`MATCH (e:Event{id: ${sportEventId}}) RETURN e;`)
							.then((result) => {
								expect(result.records).have.lengthOf(1);
								
								done();
							});
					});
			})
	});
	
	it('Attend a SportEvent', (done) => {
		createEventInNeo4j()
			.then(() => {
				auth.encodeToken(user2)
					.catch((err) => next(err))
					.then((accessToken) => {
						token = accessToken;
					})
					.then(() => {
						chai.request(server)
							.post(`/api/v1/sportevents/${sportEventId}/attend`)
							.send({email: user2.email, eventId: sportEventId})
							.set({Authorization: `Bearer ${token}`})
							.end((err, res) => {
								expect(err).to.be.null;
								expect(res).to.have.status(200);
								
								session.run(`MATCH (u:User{id: "${user2._id}"}) MATCH (e:Event{id: ${sportEventId}}) MATCH (u)-[:IS_ATTENDING]-(e) RETURN u, e;`)
									.then((result) => {
										expect(result.records[0]._fields).to.have.lengthOf(2);
										
										done();
									});
							});
					});
			});
	});
	
	it('Leave a SportEvent when user created the event', (done) => {
		createEventInNeo4j()
			.then(() => {
				auth.encodeToken(user1)
					.catch((err) => next(err))
					.then((accessToken) => {
						token = accessToken;
					})
					.then(() => {
						chai.request(server)
							.post(`/api/v1/sportevents/${sportEventId}/leave`)
							.send({email: user1.email, eventId: sportEventId})
							.set({Authorization: `Bearer ${token}`})
							.end((err, res) => {
								expect(res).to.have.status(304);
								
								session.run(`
						  MATCH (u:User{id: "${user1._id}"}) 
						  MATCH (e:Event{id: ${sportEventId}}) 
						  MATCH (u)-[:IS_ATTENDING]->(e) 
						  RETURN u, e;`
								)
									.then((result) => {
										expect(result.records[0]._fields).have.lengthOf(2);
										done();
									});
							});
					});
			});
	});
	
	it('Leave a SportEvent when user did not create the event', (done) => {
		createEventInNeo4j()
			.then(() => {
				auth.encodeToken(user2)
					.catch((err) => next(err))
					.then((accessToken) => {
						token = accessToken;
					})
					.then(() => {
						chai.request(server)
							.post(`/api/v1/sportevents/${sportEventId}/leave`)
							.send({email: user2.email, eventId: sportEventId})
							.set({Authorization: `Bearer ${token}`})
							.end((err, res) => {
								expect(err).to.be.null;
								expect(res).to.have.status(200);
								expect(res.body).to.include({msg: "User succesfully removed from event"});
								
								session.run(`MATCH (u:User{id: "${user2._id}"}) MATCH (e:Event{id: ${sportEventId}}) MATCH (u)-[:IS_ATTENDING]->(e) RETURN u, e;`)
									.then((result) => {
										expect(result.records).to.have.lengthOf(0);
										
										done();
									});
							});
					});
			});
	});
	
	it('Delete a SportEvent correct account', (done) => {
		createEventInNeo4j()
			.then(() => mockDelete())
			.then(() => {
				auth.encodeToken(user1)
					.catch((err) => next(err))
					.then((accesToken) => {
						token = accesToken;
					})
					.then(() => {
						chai.request(server)
							.delete(`/api/v1/sportevents/${sportEventId}`)
							.send({email: user1.email, eventId: sportEventId})
							.set({Authorization: `Bearer ${token}`})
							.end((err, res) => {
								expect(err).to.be.null;
								expect(res).to.have.status(200);
								
								session.run(`MATCH (e:Event{id: ${sportEventId}}) RETURN e;`)
									.then((result) => {
										expect(result.records).to.have.lengthOf(0);
										
										done();
									});
							});
					});
			});
	});
	
	it('Delete a SportEvent wrong account', (done) => {
		createEventInNeo4j()
			.then(() => mockDelete())
			.then(() => {
				auth.encodeToken(user2)
					.catch((err) => next(err))
					.then((accessToken) => {
						token = accessToken;
					})
					.then(() => {
						chai.request(server)
							.delete(`/api/v1/sportevents/${sportEventId}`)
							.send({email: user2.email, eventId: sportEventId})
							.set({Authorization: `Bearer ${token}`})
							.end((err, res) => {
								expect(res).to.have.status(401);
								
								session.run(`MATCH (e:Event{id: ${sportEventId}}) RETURN e;`)
									.then((result) => {
										expect(result.records).to.have.lengthOf(1); //Event should still exist
										
										done();
									});
							});
					});
			});
	});
	
	it('Retrieving a single sportevent should return a sportevent', (done) => {
		neo4jallRelations()
			.then(() => mockGet())
			.then(() => {
				auth.encodeToken(user1)
					.catch((err) => next(err))
					.then((accessToken) => {
						token = accessToken;
					})
					.then(() => {
						chai.request(server)
							.get(`/api/v1/sportevents/${sporteventResponse.sportEventId}`)
							.set({Authorization: `Bearer ${token}`})
							.end((err, res) => {
								console.log("Error: " + JSON.stringify(err));
								
								expect(err).to.be.null;
								expect(res).to.have.status(200);
								expect(res.body).to.be.an('object');
								expect(res.body.organisor).to.include({_id: `${organisorId}`});
								expect(res.body.attendees).to.be.an('array').and.have.lengthOf(3);
								expect(res.body.sport).to.be.an('object');
								expect(res.body.reservation).to.be.an('object');
								expect(res.body.reservation.hall).to.be.an('object');
								expect(res.body.reservation.hall.building).to.be.an('object');
								done();
							});
					})
			});
	});
	
	it('GET /sportevents/ Retrieving multiple sportevents should return a sportevent', (done) => {
		neo4jallRelations()
			.then(() => mockGet())
			.then(() => {
				auth.encodeToken(user1)
					.catch((err) => next(err))
					.then((accessToken) => {
						token = accessToken;
					})
					.then(() => {
						chai.request(server)
							.get(`/api/v1/sportevents`)
							.set({Authorization: `Bearer ${token}`})
							.end((err, res) => {
								console.log("Error: " + JSON.stringify(err));
								console.log("Response: " + JSON.stringify(res.body));
								
								
								expect(err).to.be.null;
								expect(res).to.have.status(200);
								expect(res.body).to.be.an('array').and.have.lengthOf(2);
								expect(res.body[1].organisor).to.include({_id: `${organisorId}`});
								expect(res.body[1].attendees).to.be.an('array').and.have.lengthOf(2);
								done();
							});
					});
			});
	});
});