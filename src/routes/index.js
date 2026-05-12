const { Router } = require('express');
const menuRoutes       = require('./menu.routes');
const categoriesRoutes = require('./categories.routes');
const ordersRoutes     = require('./orders.routes');
const tablesRoutes     = require('./tables.routes');

const router = Router();

router.use('/menu',       menuRoutes);
router.use('/categories', categoriesRoutes);
router.use('/orders',     ordersRoutes);
router.use('/tables',     tablesRoutes);

module.exports = router;
