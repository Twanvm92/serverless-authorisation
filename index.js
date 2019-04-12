const express = require('express');
const parser = require('body-parser');
const passport = require('passport');

const config = require('./config/env');
const middleware = require('./config/middleware');
const db = require('./db/database');

const api_v1 = require('./routes/api.v1');
const basic = require('./controllers/basic');

const app = express();

process.env.NODE_ENV !== 'test' ? db.start() : null;

app.use(middleware.protectionHeaders);
app.use(middleware.preflightHandler);

app.set('SECRET_KEY', config.secretkey);
app.use(parser.json());
app.use(parser.urlencoded({extended:true}));
app.use(passport.initialize());

app.use('/api/v1', api_v1);

app.use(middleware.errorHandler);

app.all('*', basic.notFound);

app.listen(config.port, () => {
  console.log(`Running on port: ${config.port}`);
});

module.exports = app;
