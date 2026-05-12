const { Router } = require('express');
const { getTableStatus } = require('../controllers/tables.controller');

const router = Router();

// GET /api/v1/tables/:id/status
router.get('/:id/status', getTableStatus);

module.exports = router;
