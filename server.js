// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Dummy storage (you can later replace with a database)
let receivedItems = [];

// Health check
app.get('/', (req, res) => {
  res.send('SavedSync Backend is running');
});

// Handle sync from extension
app.post('/api/sync/bulk', (req, res) => {
  const { items, timestamp } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'Invalid data' });
  }

  receivedItems = [...items]; // Overwrite for now
  console.log(`Received ${items.length} items at ${timestamp}`);
  
  return res.status(200).json({ success: true, message: 'Items synced' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
