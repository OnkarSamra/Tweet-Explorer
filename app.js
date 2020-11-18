const express = require('express');
const mapRouter = require('./routes/map');
const tweetsRouter = require('./routes/tweets');

const app = express();

app.use('/', mapRouter);
app.use('/tweets', tweetsRouter);

module.exports = app;