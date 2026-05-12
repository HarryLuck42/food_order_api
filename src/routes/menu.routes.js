const { Router } = require('express');
const { getMenu } = require('../controllers/menu.controller');

const router = Router();

// GET /api/v1/menu?table_id={id}
router.get('/', getMenu);

module.exports = router;
