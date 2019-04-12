const neo4j = require('neo4j-driver').v1;
const config = require('../config/env.js');

const db = new neo4j.driver(config.neo4j.url, neo4j.auth.basic(config.neo4j.username, config.neo4j.password));

const session = db.session();

module.exports = session;
