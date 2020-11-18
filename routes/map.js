const express = require('express');
const logger = require('morgan');
const path = require('path');
const router = express.Router();

router.use(logger('dev'));
router.use(express.static(__dirname + "/../public"));

// Top app path where the map is rendered via inline loading in maps.html with a callback script to initalise the map
// The map is interactive and will redirect user input map clicks to the route below
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/map.html'));
});

module.exports = router;