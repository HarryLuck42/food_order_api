const pool = require('../../db/connection');

async function getCategories(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, restaurant_id, name, sort_order
       FROM categories
       ORDER BY sort_order`
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCategories };
