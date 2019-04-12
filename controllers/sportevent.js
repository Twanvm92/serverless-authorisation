const neo4j = require('../db/neo4j');
const objectId = require('mongodb').ObjectID;
const mongoose = require('mongoose');
const axios = require('axios');
const config = require('../config/env');
const parser = require('parse-neo4j');
const _ = require('lodash');

const User = require('../models/user');

module.exports = {
	add(req, res, next)  {
		let eventId = req.body.eventId || '';
		
		if (eventId != '') {
			neo4j.run("MERGE (u:User {id: {idParam}}) " +
				"MERGE (e:Event {id: {eventParam}}) " +
				"MERGE (e)-[:CREATED_BY]->(u) " +
				"MERGE (u)-[:IS_ATTENDING]->(e) " +
				"RETURN u, e;", {
				idParam: req.user._id.toString(),
				eventParam: eventId,
			}).catch(err => next(err)).then(result => {
				res.status(201).json({msg: "Event successfully created"});
				neo4j.close();
			})
		}
	},
	
	get(req, res, next) {
		const eventId = req.params.id || '';
		let sportevent;
		let sportId;
		let organisatorId;
		let hallId;
		let reservationId;
		let buildingId;
		let finalSportEvents = [];
		
		axios.get(config.sportunite_asp_api.url + `/sportevents/${eventId}`)
			.catch(err => {
        console.log('Sportevent ERROR: ' + err);
				next(err)
      })
			.then(response => {
				console.log('sportevent response: ' + JSON.stringify(response.data));
				if (eventId === '') { // if eventid == '' it means a get request has been send for all sportevents
					const resultAsSportevents = response.data._embedded.sportevents || '';
					
					return _.reduce(resultAsSportevents, (curr, next) => { // return one result of all promise chains
						return curr.then(() => getSporteventPromise(next)); // chains every function with promise chain.
					}, Promise.resolve("MESSAGE: All promises completed!"));
				} else { // a get request had been send for just one particular sportevent
					sportevent = response.data || '';
					return getSporteventPromise(sportevent);
				}
			})
			.catch(err => next(err))
			.then((sportevent) => {
				console.log(sportevent);
				if (sportevent === undefined) {
					res.status(200).send(finalSportEvents);
				} else {
					res.status(200).send(sportevent);
				}
			});
		
		function getSporteventPromise(sportevent) {
			sportId = sportevent.sportId;
			reservationId = sportevent.reservationId;
			sportevent = _.pick(sportevent, ['sportEventId', 'name', 'minAttendees', 'maxAttendees',
				'description', 'eventStartTime', 'eventEndTime']);
			// get the sport connected to sportevent
			
			return axios.get(config.sportunite_asp_api.url + `/sports/${sportId}`)
				.catch(err => next(err))
				.then((response) => {
					console.log('response sport: ' + JSON.stringify(response.data));
					const sport = response.data || '';
					sportevent.sport = _.pick(sport, ['sportId', 'name']);
					
					if (reservationId !== null) { // get the reservation connected to sportevent if there is a reservation id
						// create a nested chain of promises that retrieves the reservation, hall and building.
						// returns the promise chain so the neo4j query chain can chain on this one.
						// if reservation on sportevent doesnt exist this nested chain wont be fired.
						return axios.get(config.sportunite_asp_api.url + `/reservations/${reservationId}`)
							.then(response => {
								const reservation = response.data || '';
								hallId = reservation.hallId;
								sportevent.reservation = _.pick(reservation, ['reservationId', 'startTime', 'timeFinish', 'definite']);
								// get the hall connected to the reservation
								return axios.get(config.sportunite_asp_api.url + `/halls/${hallId}`);
							})
							.catch(err => next(err))
							.then((response) => {
								const hall = response.data || '';
								buildingId = hall.buildingId;
								sportevent.reservation.hall = _.pick(hall, ['hallId', 'name', 'size', 'price']);
								// get the building connected to the hall
								return axios.get(config.sportunite_asp_api.url + `/buildings/${buildingId}`);
							})
							.catch(err => next(err))
							.then(response => {
								const building = response.data || '';
								sportevent.reservation.hall.building = _.pick(building, ['buildingId', 'name', 'address']);
								
							})
							.catch(err => next(err));
					}
				})
				.catch(err => next(err))
				.then(() => {
					// now get the attendees and organisor from neo4j
					return neo4j
						.run(
							"MATCH (u:User)-[rel2:IS_ATTENDING]->(e:Event {id: {eventParam}})-[rel1:CREATED_BY]->(o:User)" +
							"RETURN collect(u) AS attendees, o AS organiser",
							{eventParam: sportevent.sportEventId}
						);
				})
				.catch(err => next(err))
				.then(parser.parse)
				.then((parsed) => {
					organisatorId = parsed[0].organiser.id; // save organisor id to find it later on
					let userIds;
					userIds = parsed[0].attendees.map((attendee) => mongoose.mongo.ObjectId(attendee.id));
					neo4j.close();
					// now get the user information for the attendees and organisor
					return User.find({'_id': {$in: userIds}});
				})
				.catch(err => next(err))
				.then((users) => {
					sportevent.attendees = users; // all users are attendees
					sportevent.organisor = _.find(users, (user) => { // find the one organisor by checking its id
						return user._id.toString() === organisatorId ? user : undefined;
					});
					
					if (eventId === '') { // more sportevents will likely be requested after this one.
						finalSportEvents.push(sportevent);
					} else { // this function will only be fired once so return the sportevent
						return sportevent;
					}
				});
		}
	},
	
	attend(req, res, next) {
		let eventId = req.body.eventId || '';
		
		if (eventId != '') {
			neo4j.run("MATCH (u:User {id: {idParam}}) " +
				"MATCH (e:Event {id: {eventParam}}) " +
				"MERGE (u)-[:IS_ATTENDING]->(e) " +
				"RETURN e, u;", {
					idParam: req.user._id.toString(),
					eventParam: eventId
				}
			).catch(err => next(err)).then(result => {
				res.status(200).json({msg: "User successfully added to event"});
				neo4j.close();
			});
		}
	},
	
	leave(req, res, next) {
		let eventId = req.body.eventId || '';
		
		if (eventId != '') {
			neo4j.run("MATCH (u:User {id: {idParam}}) " +
				"MATCH (e:Event {id: {eventParam}}) " +
				"MATCH (e)-[:CREATED_BY]->(u) " +
				"RETURN u, e", {
					idParam: req.user._id.toString(),
					eventParam: eventId
				}
			).then((result) => {
				if (result.records.length == 0) {
					//User did not create the event, so we can delete his attendance
					neo4j.run("MATCH (u:User {id: {idParam}}) " +
						"MATCH (e:Event {id: {eventParam}}) " +
						"MATCH (u)-[r:IS_ATTENDING]->(e) " +
						"DELETE r", {
							idParam: req.user._id.toString(),
							eventParam: eventId
						}
					).catch(err => next(err)).then(result => {
						res.status(200).json({msg: "User succesfully removed from event"});
						neo4j.close();
					});
				} else {
					//User did create the event, so we cannot delete his attendance
					res.status(304).json({msg: "User couldn't be removed from event due to his status"});
				}
			});
		}
	},
	
	remove(req, res, next) {
		console.log('remove');
		let eventId = req.params.id || '';
		let userId = req.user._id || '';
		
		console.log(eventId);
		
		if (objectId.isValid(userId)) {
			if (eventId != '') {
				neo4j.run(`MATCH (u:User{id: "${req.user._id.toString()}"}) ` +
					`MATCH (e:Event{id: ${eventId}}) ` +
					`MATCH (e)-[:CREATED_BY]->(u) ` +
					`DETACH DELETE e ` +
					`RETURN u`)
					.catch(err => next(err))
					.then((result) => {
						console.log(result);
						if (result.records.length == 0) {
							res.status(401).json({msg: "User did not create of the event"});
						} else {
							axios.delete(config.sportunite_asp_api.url + `/sportevents/${eventId}`)
								.catch(err => next(err))
								.then((response) => {
									console.log('Backend response: ' + response);
									
									neo4j.close();
									res.status(200).json({msg: "Sport event successfully deleted"});
								});
						}
					});
			}
		} else {
			res.status(422).json({error: "Invalid user id"});
		}
	}
};
