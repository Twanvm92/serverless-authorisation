const serverless = require('serverless-http');
const express = require('express');
const parser = require('body-parser');
const passport = require('passport');
const passport_auth0 = require('passport-auth0');

const config = require('./config/env');
const middleware = require('./config/middleware');

const api_v1 = require('./routes/api.v1');
const basic = require('./controllers/basic');

const app = express();

app.use(middleware.protectionHeaders);
app.use(middleware.preflightHandler);

app.use(parser.json());
app.use(parser.urlencoded({extended:true}));
app.use(passport.initialize());

app.use('/api/v1', api_v1);

app.use(middleware.errorHandler);

// //add the router
// app.use(express.static(__dirname + '/frontend/view'));
// //Store all HTML files in view folder.
// app.use(express.static(__dirname + '/frontend/script'));
// //Store all JS and CSS in Scripts folder.

app.all('*', basic.notFound);

// app.listen(config.port, () => {
//   console.log(`Running on port: ${config.port}`);
// });

module.exports.handler = serverless(app);
