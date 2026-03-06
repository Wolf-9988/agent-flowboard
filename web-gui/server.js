const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to simulate sending a command and getting a status
app.get('/api/status', (req, res) => {
  console.log('Received request for /api/status');
  // In a real scenario, this would interact directly with the core AgentFlowboard logic,
  // acting as an alternative interface to the Telegram bot.
  const mockStatus = {
    message: 'Command simulated successfully!',
    data: 'AgentFlowboard is operational. Last command: test_command_from_web_gui',
    timestamp: new Date().toISOString()
  };
  res.json(mockStatus);
});

app.listen(PORT, () => {
  console.log(`Web GUI server listening on port ${PORT}`);
});
