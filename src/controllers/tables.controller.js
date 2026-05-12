const pool = require('../../db/connection');

async function getTableStatus(req, res, next) {
  const { id } = req.params;

  try {
    const tableResult = await pool.query(
      `SELECT rt.id, r.id AS restaurant_id, r.name AS restaurant_name
       FROM restaurant_tables rt
       JOIN restaurants r ON r.id = rt.restaurant_id
       WHERE rt.id = $1`,
      [id]
    );

    if (tableResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Table '${id}' not found` },
      });
    }

    const table = tableResult.rows[0];

    const ordersResult = await pool.query(
      `SELECT id, status, total_price, created_at
       FROM orders
       WHERE table_id = $1
         AND status NOT IN ('completed', 'cancelled')
       ORDER BY created_at DESC`,
      [id]
    );

    const activeOrders = ordersResult.rows;

    res.json({
      success: true,
      data: {
        table_id: table.id,
        restaurant: { id: table.restaurant_id, name: table.restaurant_name },
        status: activeOrders.length > 0 ? 'occupied' : 'available',
        active_orders: activeOrders.map(o => ({
          id: o.id,
          status: o.status,
          total_price: parseFloat(o.total_price),
          created_at: o.created_at,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getTableStatus };
