var express = require('express');
var router = express.Router();

router.use(function(req, res, next) {
    console.log(req.method, req.url);
    next();
});

router.use('/admin', require('./admin'));
router.use('/wfs', require('./wfs'));

module.exports = router;