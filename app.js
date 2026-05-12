const express = require('express');
const routes = require('./src/routes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

app.use(express.json());

app.use('/api/v1', routes);

app.use(errorHandler);

module.exports = app;
