// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Store items in memory (temporary)
let storedItems = [];

// Test route
app.get('/', (req, res) => {
  res.send('✅ SavedSync Backend is running');
});

// Receive bulk synced items
app.post('/api/sync/bulk', (req, res) => {
  const { items, timestamp } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'Invalid data' });
  }

  console.log(`Received ${items.length} items at ${timestamp}`);
  storedItems = [...items]; // Replace or update storage as needed

  res.json({ success: true, message: 'Items received' });
});

// Optional: allow retrieving saved items for testing
app.get('/api/items', (req, res) => {
  res.json(storedItems);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
