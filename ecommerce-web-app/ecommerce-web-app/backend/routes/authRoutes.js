const router = require('express').Router();
const { wrap } = require('../config/helpers');
const c = require('../controllers/authController');

router.post('/register', wrap(c.register));
router.post('/login', wrap(c.login));

module.exports = router;
