const pool = require('../../db/connection');

// ── POST /api/v1/orders ────────────────────────────────────────────────────────
async function createOrder(req, res, next) {
  const { table_id, items, customer_note } = req.body;

  // Basic shape validation
  if (!table_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_BODY', message: 'table_id and a non-empty items array are required' },
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Validate table exists
    const tableResult = await client.query(
      'SELECT id FROM restaurant_tables WHERE id = $1',
      [table_id]
    );
    if (tableResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Table '${table_id}' not found` },
      });
    }

    let orderTotal = 0;
    const enrichedItems = [];

    for (const [index, orderItem] of items.entries()) {
      const { menu_item_id, quantity, customizations = [] } = orderItem;

      if (!menu_item_id || !quantity || quantity < 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ITEM',
            message: `Item at index ${index} must have menu_item_id and quantity >= 1`,
          },
        });
      }

      // 2. Fetch menu item
      const itemResult = await client.query(
        'SELECT id, name, price FROM items WHERE id = $1',
        [menu_item_id]
      );
      if (itemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Menu item ${menu_item_id} not found` },
        });
      }

      const menuItem = itemResult.rows[0];

      // 3. Fetch all customization groups and their options for this item
      const groupsResult = await client.query(
        `SELECT cg.id AS group_id, cg.name AS group_name, cg.required, cg.max_selections,
                co.id AS option_id, co.price_modifier
         FROM customization_groups cg
         LEFT JOIN customization_options co ON co.group_id = cg.id
         WHERE cg.item_id = $1`,
        [menu_item_id]
      );

      // Build group map: groupId → { required, max_selections, optionIds: Set }
      const groupMap = new Map();
      for (const row of groupsResult.rows) {
        if (!groupMap.has(row.group_id)) {
          groupMap.set(row.group_id, {
            name: row.group_name,
            required: row.required,
            max_selections: row.max_selections,
            optionIds: new Set(),
            optionPrices: new Map(),
          });
        }
        if (row.option_id) {
          groupMap.get(row.group_id).optionIds.add(row.option_id);
          groupMap.get(row.group_id).optionPrices.set(row.option_id, parseFloat(row.price_modifier));
        }
      }

      // Build a reverse map: optionId → groupId
      const optionToGroup = new Map();
      for (const [groupId, group] of groupMap) {
        for (const optId of group.optionIds) {
          optionToGroup.set(optId, groupId);
        }
      }

      // 4. Validate customizations and track which groups are covered
      const coveredGroups = new Map(); // groupId → count of distinct options selected
      const validatedCustomizations = [];

      for (const c of customizations) {
        const { option_id, quantity: optQty = 1 } = c;

        if (!optionToGroup.has(option_id)) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_OPTION',
              message: `Option ${option_id} does not belong to menu item ${menu_item_id}`,
            },
          });
        }

        const groupId = optionToGroup.get(option_id);
        coveredGroups.set(groupId, (coveredGroups.get(groupId) || 0) + 1);

        validatedCustomizations.push({
          option_id,
          quantity: optQty,
          price_modifier: groupMap.get(groupId).optionPrices.get(option_id),
        });
      }

      // 5. Check max_selections per group
      for (const [groupId, selectedCount] of coveredGroups) {
        const group = groupMap.get(groupId);
        if (selectedCount > group.max_selections) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: {
              code: 'EXCEEDS_MAX_SELECTIONS',
              message: `Group '${group.name}' allows max ${group.max_selections} selection(s), got ${selectedCount}`,
            },
          });
        }
      }

      // 6. Check required groups are satisfied
      for (const [groupId, group] of groupMap) {
        if (group.required && !coveredGroups.has(groupId)) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: {
              code: 'MISSING_REQUIRED_CUSTOMIZATION',
              message: `Customization group '${group.name}' is required for '${menuItem.name}'`,
            },
          });
        }
      }

      // 7. Calculate subtotal
      const customizationTotal = validatedCustomizations.reduce(
        (sum, c) => sum + c.price_modifier * c.quantity,
        0
      );
      const unitPrice = parseFloat(menuItem.price);
      const subtotal  = (unitPrice + customizationTotal) * quantity;

      orderTotal += subtotal;
      enrichedItems.push({ menuItem, quantity, unitPrice, subtotal, customizations: validatedCustomizations });
    }

    // 8. Insert order
    const orderResult = await client.query(
      `INSERT INTO orders (table_id, customer_note, total_price)
       VALUES ($1, $2, $3)
       RETURNING id, status, created_at`,
      [table_id, customer_note || null, orderTotal.toFixed(2)]
    );
    const order = orderResult.rows[0];

    // 9. Insert order items and their customizations
    for (const item of enrichedItems) {
      const orderItemResult = await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [order.id, item.menuItem.id, item.quantity, item.unitPrice.toFixed(2), item.subtotal.toFixed(2)]
      );
      const orderItemId = orderItemResult.rows[0].id;

      for (const c of item.customizations) {
        await client.query(
          `INSERT INTO order_item_customizations (order_item_id, option_id, quantity, price_modifier)
           VALUES ($1, $2, $3, $4)`,
          [orderItemId, c.option_id, c.quantity, c.price_modifier.toFixed(2)]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        order_id: order.id,
        table_id,
        status: order.status,
        total_price: parseFloat(orderTotal.toFixed(2)),
        customer_note: customer_note || null,
        created_at: order.created_at,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// ── GET /api/v1/orders/:id ────────────────────────────────────────────────────
async function getOrder(req, res, next) {
  const orderId = parseInt(req.params.id, 10);

  if (isNaN(orderId)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PARAM', message: 'Order ID must be a number' },
    });
  }

  try {
    const orderResult = await pool.query(
      `SELECT id, table_id, status, customer_note, total_price, created_at, updated_at
       FROM orders WHERE id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Order ${orderId} not found` },
      });
    }

    const order = orderResult.rows[0];

    const itemsResult = await pool.query(
      `SELECT
          oi.id           AS order_item_id,
          i.id            AS menu_item_id,
          i.name          AS item_name,
          oi.quantity,
          oi.unit_price,
          oi.subtotal,
          oic.option_id,
          co.name         AS option_name,
          oic.price_modifier,
          oic.quantity    AS option_quantity
       FROM order_items oi
       JOIN items i ON i.id = oi.menu_item_id
       LEFT JOIN order_item_customizations oic ON oic.order_item_id = oi.id
       LEFT JOIN customization_options     co  ON co.id = oic.option_id
       WHERE oi.order_id = $1
       ORDER BY oi.id, oic.id`,
      [orderId]
    );

    // Group customizations under each order item
    const itemsMap = new Map();
    for (const row of itemsResult.rows) {
      if (!itemsMap.has(row.order_item_id)) {
        itemsMap.set(row.order_item_id, {
          id: row.order_item_id,
          menu_item_id: row.menu_item_id,
          name: row.item_name,
          quantity: row.quantity,
          unit_price: parseFloat(row.unit_price),
          subtotal: parseFloat(row.subtotal),
          customizations: [],
        });
      }
      if (row.option_id) {
        itemsMap.get(row.order_item_id).customizations.push({
          option_id: row.option_id,
          option_name: row.option_name,
          price_modifier: parseFloat(row.price_modifier),
          quantity: row.option_quantity,
        });
      }
    }

    res.json({
      success: true,
      data: {
        id: order.id,
        table_id: order.table_id,
        status: order.status,
        customer_note: order.customer_note,
        total_price: parseFloat(order.total_price),
        items: [...itemsMap.values()],
        created_at: order.created_at,
        updated_at: order.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /api/v1/orders/:id/status ──────────────────────────────────────────
const ALLOWED_TRANSITIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready',     'cancelled'],
  ready:     ['served',    'cancelled'],
  served:    [],
  cancelled: [],
};

async function updateOrderStatus(req, res, next) {
  const orderId = parseInt(req.params.id, 10);
  const { status: newStatus } = req.body;

  if (isNaN(orderId)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_PARAM', message: 'Order ID must be a number' },
    });
  }

  if (!newStatus) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_BODY', message: 'status field is required' },
    });
  }

  try {
    const orderResult = await pool.query(
      'SELECT id, status FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Order ${orderId} not found` },
      });
    }

    const currentStatus = orderResult.rows[0].status;
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot change status from '${currentStatus}' to '${newStatus}'. Allowed: ${allowed.length ? allowed.join(', ') : 'none'}`,
        },
      });
    }

    const updated = await pool.query(
      `UPDATE orders
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, table_id, status, total_price, updated_at`,
      [newStatus, orderId]
    );

    res.json({
      success: true,
      message: `Order status updated to '${newStatus}'`,
      data: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, getOrder, updateOrderStatus };
