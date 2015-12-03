var express = require('express');
var router = express.Router();

router.route('/')
    .get(function(req, res) {
        console.log("wfs en travaux");
    });

module.exports = router;