/**
 * Created by twanv on 21-12-2017.
 */
const mongoose = require('mongoose');
const config = require('../config/env');
const session = require ('../db/neo4j');
const _ = require('lodash');



before((done) => {
    mongoose.Promise = global.Promise;
    mongoose.connect(`${config.mongo.host}/${config.mongo.test}`, config.mongo.options);
        // .catch(err => console.warn('Could not connect to MongoDB'));
    mongoose.connection
        .once('open', () => {
            console.log(`Connected to Mongo on ${config.mongo.test}`);
            done();
        })
        .on("error", (error) => {
            console.warn('Warning', error);
        });
});


beforeEach((done) => {
    const { users } = mongoose.connection.collections;
    users.drop(() => {
        session
            .run(
                "MATCH (n) " +
                "OPTIONAL MATCH (n)-[r]-() " +
                "DELETE n,r "
            )
            .then(() => {
                // console.log('testdb: all neo4j nodes + r have been dropped');
                done();
            })
            .catch((error) => console.log(error));
    });



});
