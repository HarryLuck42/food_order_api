const pool = require('../../db/connection');

// How long an order must stay in each status before auto-advancing
const TRANSITIONS = [
  { from: 'pending',   to: 'confirmed', delaySeconds: 120  }, // 2 minutes
  { from: 'confirmed', to: 'preparing', delaySeconds: 30   }, // 30 seconds
  { from: 'preparing', to: 'ready',     delaySeconds: 600  }, // 10 minutes
  { from: 'ready',     to: 'served',    delaySeconds: 60   }, // 1 minute
];

async function processTransitions() {
  for (const { from, to, delaySeconds } of TRANSITIONS) {
    try {
      const result = await pool.query(
        `UPDATE orders
         SET status     = $1,
             updated_at = NOW()
         WHERE status     = $2
           AND updated_at <= NOW() - ($3 * INTERVAL '1 second')
         RETURNING id, table_id, status`,
        [to, from, delaySeconds]
      );

      for (const order of result.rows) {
        console.log(
          `[Scheduler] Order #${order.id} | table ${order.table_id} | ${from} → ${to}`
        );
      }
    } catch (err) {
      console.error(`[Scheduler] Error on ${from} → ${to}:`, err.message);
    }
  }
}

function startScheduler() {
  console.log('[Scheduler] Order status scheduler started');
  console.log('[Scheduler] Rules:');
  for (const { from, to, delaySeconds } of TRANSITIONS) {
    console.log(`  ${from} → ${to} after ${delaySeconds}s`);
  }

  processTransitions();
  return setInterval(processTransitions, 10_000); // check every 10 seconds
}

module.exports = { startScheduler };
