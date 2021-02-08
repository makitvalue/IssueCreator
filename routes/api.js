var express = require('express');
var router = express.Router();


// Youduck
router.use('/youduck', require('./api/youduck.js'));


module.exports = router;
