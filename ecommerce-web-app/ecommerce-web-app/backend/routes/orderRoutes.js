const router = require('express').Router();
const { wrap } = require('../config/helpers');
const { authenticate, requireRole } = require('../middleware/auth');
const c = require('../controllers/orderController');

router.use(authenticate);

router.post('/', requireRole('user'), wrap(c.create));              // shoppers place orders
router.get('/', wrap(c.list));                                       // user: own, admin: all
router.get('/:id', wrap(c.getOne));
router.put('/:id/status', requireRole('admin'), wrap(c.updateStatus));
router.put('/:id/cancel', requireRole('user'), wrap(c.cancel));

module.exports = router;
