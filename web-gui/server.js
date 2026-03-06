const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const DASHBOARD_API_URL = 'http://dashboard:18790/api';
const DASHBOARD_ACCESS_TOKEN = process.env.DASHBOARD_ACCESS_TOKEN;

// API endpoint to get projects
app.get('/api/web/projects', async (req, res) => {
  console.log('Received request for /api/web/projects');
  try {
    const response = await fetch(`${DASHBOARD_API_URL}/projects`, {
      headers: {
        'x-web-gui-access': DASHBOARD_ACCESS_TOKEN
      }
    });
    if (!response.ok) {
      throw new Error(`Dashboard API responded with status ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching projects from dashboard:', error.message);
    res.status(500).json({ error: 'Failed to fetch projects', details: error.message });
  }
});

// API endpoint to get tasks for a specific project
app.get('/api/web/projects/:projectName/tasks', async (req, res) => {
  const projectName = req.params.projectName;
  console.log(`Received request for tasks for project: ${projectName}`);
  try {
    const response = await fetch(`${DASHBOARD_API_URL}/projects/${projectName}/tasks`, {
      headers: {
        'x-web-gui-access': DASHBOARD_ACCESS_TOKEN
      }
    });
    if (!response.ok) {
      throw new Error(`Dashboard API responded with status ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`Error fetching tasks for project ${projectName} from dashboard:`, error.message);
    res.status(500).json({ error: `Failed to fetch tasks for project ${projectName}`, details: error.message });
  }
});

// Existing API endpoint to simulate sending a command and getting a status
app.get('/api/status', (req, res) => {
  console.log('Received request for /api/status');

  const headers = {
    'x-web-gui-access': DASHBOARD_ACCESS_TOKEN
  };
  console.log('Simulating request with headers:', headers);

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
