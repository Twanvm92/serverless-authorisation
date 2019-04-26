const dotenv = require('dotenv');

result = dotenv.config();

if (result.error) {
	throw result.error;
}

const env = {
	port: process.env.PORT || 8080,
	allowOrigin: process.env.ALLOW_ORIGIN || '*'
}

module.exports = env;
