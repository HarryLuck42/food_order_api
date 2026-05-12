const { Router } = require('express');
const { createOrder, getOrder, updateOrderStatus } = require('../controllers/orders.controller');

const router = Router();

// POST /api/v1/orders
router.post('/', createOrder);

// GET /api/v1/orders/:id
router.get('/:id', getOrder);

// PATCH /api/v1/orders/:id/status
router.patch('/:id/status', updateOrderStatus);

module.exports = router;
