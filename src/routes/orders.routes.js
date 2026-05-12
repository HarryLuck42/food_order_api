const { Router } = require('express');
const { createOrder, getOrder } = require('../controllers/orders.controller');

const router = Router();

// POST /api/v1/orders
router.post('/', createOrder);

// GET /api/v1/orders/:id
router.get('/:id', getOrder);

module.exports = router;
