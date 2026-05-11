const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// The "Health Check" Route
app.get('/api/health', (req, res) => {
  res.json({ status: "Server is running!", timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server spinning on http://localhost:${PORT}`);
});