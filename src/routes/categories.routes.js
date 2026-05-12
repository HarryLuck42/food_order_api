const { Router } = require('express');
const { getCategories } = require('../controllers/categories.controller');

const router = Router();

// GET /api/v1/categories
router.get('/', getCategories);

module.exports = router;
