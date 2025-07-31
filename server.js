// server.js - Fixed for Render deployment
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://your-vercel-app.vercel.app', // Replace with your actual Vercel URL
    /\.vercel\.app$/ // Allow all Vercel subdomains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Store items in memory (temporary - we'll add database later)
let storedItems = [];

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    itemCount: storedItems.length 
  });
});

// Main route - return items for mobile app
app.get('/', (req, res) => {
  console.log(`Serving ${storedItems.length} items`);
  res.json(storedItems.map(item => ({
    id: item.id || Date.now() + Math.random(),
    title: item.content || item.author || 'Untitled item',
    platform: item.platform,
    author: item.author,
    content: item.content,
    url: item.url,
    savedDate: item.savedDate,
    type: item.type
  })));
});

// Get all items (same as root, but explicit)
app.get('/api/items', (req, res) => {
  res.json(storedItems);
});

// Receive bulk synced items from extension
app.post('/api/sync/bulk', (req, res) => {
  try {
    const { items, timestamp } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid data: items must be an array' 
      });
    }

    console.log(`📥 Received ${items.length} items at ${timestamp}`);
    
    // Merge new items with existing ones, avoiding duplicates
    items.forEach(newItem => {
      const existingIndex = storedItems.findIndex(existing => 
        existing.platform === newItem.platform && 
        existing.url === newItem.url && 
        existing.content === newItem.content
      );

      if (existingIndex === -1) {
        storedItems.unshift(newItem); // Add to beginning
      } else {
        // Update existing item
        storedItems[existingIndex] = { ...storedItems[existingIndex], ...newItem };
      }
    });

    // Keep only last 1000 items to prevent memory issues
    if (storedItems.length > 1000) {
      storedItems = storedItems.slice(0, 1000);
    }

    console.log(`📊 Total items stored: ${storedItems.length}`);

    res.json({ 
      success: true, 
      message: `Stored ${items.length} items`,
      totalItems: storedItems.length
    });

  } catch (error) {
    console.error('❌ Error in bulk sync:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error processing items' 
    });
  }
});

// Add single item (for testing)
app.post('/api/items', (req, res) => {
  try {
    const item = req.body;
    item.id = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    item.savedDate = new Date().toISOString();
    
    storedItems.unshift(item);
    
    res.json({ 
      success: true, 
      message: 'Item added',
      item: item
    });
  } catch (error) {
    console.error('❌ Error adding item:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error adding item' 
    });
  }
});

// Get stats
app.get('/api/stats', (req, res) => {
  const platformCounts = {};
  storedItems.forEach(item => {
    platformCounts[item.platform] = (platformCounts[item.platform] || 0) + 1;
  });

  const today = new Date().toDateString();
  const todayItems = storedItems.filter(item => 
    new Date(item.savedDate).toDateString() === today
  ).length;

  res.json({
    totalItems: storedItems.length,
    todayItems: todayItems,
    platforms: Object.keys(platformCounts).length,
    platformCounts: platformCounts,
    lastUpdated: new Date().toISOString()
  });
});

// Delete all items (for testing)
app.delete('/api/items', (req, res) => {
  const count = storedItems.length;
  storedItems = [];
  res.json({ 
    success: true, 
    message: `Deleted ${count} items` 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    available: [
      'GET /',
      'GET /health',
      'GET /api/items',
      'POST /api/sync/bulk',
      'GET /api/stats'
    ]
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SavedSync Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});