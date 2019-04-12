const dotenv = require('dotenv');

result = dotenv.config();

if (result.error) {
	throw result.error;
}

const env = {
	port: process.env.PORT || 8080,
	allowOrigin: process.env.ALLOW_ORIGIN || '*',
	secretkey: process.env.DB_SECRET_KEY || "secretsportunite-app-510783",
	postcodeApiKey: process.env.POSTCODE_API_KEY || "7fZyozww3m2zMqd3jvtcC4VSsfvQspUl5QYP54J1",
	reservePostcodeApiKey: process.env.RESERVE_POSTCODE_API_KEY || "KOIQuTgLOPPv57hIEjXZWBSHEYJu8q5PQc7zxof0",
}

env.mongo = {
	host: process.env.MONGO_HOST || 'mongodb://127.0.0.1',
	database: process.env.MONGO_DB || 'sportunite',
	test: process.env.MONGO_TEST || 'sportunite-test',
	options: {
		useMongoClient: true,
		poolSize: 10,
		user: process.env.MONGO_USER || '',
		pass: process.env.MONGO_PASS || ''
	}
}

env.neo4j = {
	username: process.env.NEO_USER || 'neo4j',
	password: process.env.NEO_PASS || 'admin',
	url: process.env.NEO_URL || 'bolt://127.0.0.1:7687'
}

env.sportunite_asp_api = {
	url: process.env.SPORTUNITE_ASP_API || '',
	host: process.env.SPORTUNITE_ASP_API_HOST || ''
}

module.exports = env;
