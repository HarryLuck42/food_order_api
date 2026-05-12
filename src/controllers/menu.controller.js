const pool = require('../../db/connection');

async function getMenu(req, res, next) {
  const { table_id } = req.query;

  if (!table_id) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAM', message: 'table_id query parameter is required' },
    });
  }

  try {
    const { rows } = await pool.query(
      `SELECT
          r.id          AS restaurant_id,
          r.name        AS restaurant_name,
          rt.id         AS table_id,
          c.id          AS category_id,
          c.name        AS category_name,
          c.sort_order,
          i.id          AS item_id,
          i.name        AS item_name,
          i.description,
          i.price,
          i.image_url,
          cg.id         AS group_id,
          cg.name       AS group_name,
          cg.required,
          cg.max_selections,
          co.id         AS option_id,
          co.name       AS option_name,
          co.price_modifier
       FROM restaurant_tables rt
       JOIN restaurants          r  ON r.id  = rt.restaurant_id
       JOIN categories           c  ON c.restaurant_id = r.id
       JOIN items                i  ON i.category_id   = c.id
       LEFT JOIN customization_groups  cg ON cg.item_id  = i.id
       LEFT JOIN customization_options co ON co.group_id = cg.id
       WHERE rt.id = $1
       ORDER BY c.sort_order, i.id, cg.id, co.id`,
      [table_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Table '${table_id}' not found` },
      });
    }

    const restaurant = { id: rows[0].restaurant_id, name: rows[0].restaurant_name };
    const categoriesMap = new Map();

    for (const row of rows) {
      if (!categoriesMap.has(row.category_id)) {
        categoriesMap.set(row.category_id, {
          id: row.category_id,
          name: row.category_name,
          sort_order: row.sort_order,
          items: new Map(),
        });
      }

      const category = categoriesMap.get(row.category_id);

      if (!category.items.has(row.item_id)) {
        category.items.set(row.item_id, {
          id: row.item_id,
          name: row.item_name,
          description: row.description,
          price: parseFloat(row.price),
          image_url: row.image_url,
          customization_groups: new Map(),
        });
      }

      const item = category.items.get(row.item_id);

      if (row.group_id && !item.customization_groups.has(row.group_id)) {
        item.customization_groups.set(row.group_id, {
          id: row.group_id,
          name: row.group_name,
          required: row.required,
          max_selections: row.max_selections,
          options: [],
        });
      }

      if (row.option_id) {
        item.customization_groups.get(row.group_id).options.push({
          id: row.option_id,
          name: row.option_name,
          price_modifier: parseFloat(row.price_modifier),
        });
      }
    }

    const categories = [...categoriesMap.values()].map(cat => ({
      ...cat,
      items: [...cat.items.values()].map(item => ({
        ...item,
        customization_groups: [...item.customization_groups.values()],
      })),
    }));

    res.json({
      success: true,
      data: { restaurant, table_id, categories },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMenu };
