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
  const DASHBOARD_ACCESS_TOKEN = process.env.DASHBOARD_ACCESS_TOKEN;
  console.log('DASHBOARD_ACCESS_TOKEN:', DASHBOARD_ACCESS_TOKEN ? 'Set' : 'Not Set');

  // In a real scenario, this would interact directly with the core AgentFlowboard logic,
  // acting as an alternative interface to the Telegram bot.
  // When making a request to the dashboard service, include the x-web-gui-access header.
  const headers = {
    'x-web-gui-access': DASHBOARD_ACCESS_TOKEN
  };
  console.log('Simulating request with headers:', headers);

  // Example of how a fetch request *would* be made to the dashboard service with the header:
  // try {
  //   const dashboardResponse = await fetch('http://dashboard:18790/some/dashboard/api', {
  //     headers: headers
  //   });
  //   const dashboardData = await dashboardResponse.json();
  //   // Process dashboardData
  // } catch (error) {
  //   console.error('Error communicating with dashboard:', error);
  // }

  const mockStatus = {
    message: 'Command simulated successfully!',
    data: 'AgentFlowboard is operational. Last command: test_command_from_web_gui',
    timestamp: new Date().toISOString(),
    securityInfo: DASHBOARD_ACCESS_TOKEN ? 'x-web-gui-access header would be sent with token.' : 'DASHBOARD_ACCESS_TOKEN not set, header would be empty.'
  };
  res.json(mockStatus);
});

app.listen(PORT, () => {
  console.log(`Web GUI server listening on port ${PORT}`);
});
