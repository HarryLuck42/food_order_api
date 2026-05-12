require('dotenv').config();
const app = require('./app');
const { startScheduler } = require('./src/scheduler/orderStatusScheduler');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startScheduler();
});
