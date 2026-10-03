const router = require('express').Router();
const { wrap } = require('../config/helpers');
const { authenticate, requireRole } = require('../middleware/auth');
const c = require('../controllers/productController');

// Public
router.get('/', wrap(c.list));
router.get('/categories', wrap(c.categories)); // must be before "/:id"
router.get('/:id', wrap(c.getOne));

// Admin only
router.post('/', authenticate, requireRole('admin'), wrap(c.create));
router.put('/:id', authenticate, requireRole('admin'), wrap(c.update));
router.delete('/:id', authenticate, requireRole('admin'), wrap(c.remove));

module.exports = router;
