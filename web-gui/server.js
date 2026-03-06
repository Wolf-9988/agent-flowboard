const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Mock data for demonstration
const mockProjects = [
  {
    id: 'project-alpha',
    name: 'Project Alpha',
    status: 'active',
    description: 'This is the first mock project.',
    taskCounts: { total: 5, completed: 2, inProgress: 2, todo: 1 },
  },
  {
    id: 'project-beta',
    name: 'Project Beta',
    status: 'paused',
    description: 'A second mock project in a paused state.',
    taskCounts: { total: 3, completed: 1, inProgress: 1, todo: 1 },
  },
];

const mockTasks = {
  'project-alpha': [
    { id: 'T-001', title: 'Setup database', status: 'completed', priority: 'high', parentId: null, specFile: 'db_setup.md', created: '2026-03-01T10:00:00Z', completed: '2026-03-03T14:30:00Z' },
    { id: 'T-002', title: 'Implement user authentication', status: 'in-progress', priority: 'high', parentId: null, specFile: 'user_auth.md', created: '2026-03-02T11:00:00Z', completed: null },
    { id: 'T-003', title: 'Design UI for dashboard', status: 'in-progress', priority: 'medium', parentId: null, specFile: 'ui_design.md', created: '2026-03-03T09:00:00Z', completed: null },
    { id: 'T-004', title: 'Write API documentation', status: 'todo', priority: 'low', parentId: null, specFile: 'api_docs.md', created: '2026-03-04T16:00:00Z', completed: null },
    { id: 'T-005', title: 'Deploy to staging', status: 'completed', priority: 'critical', parentId: null, specFile: 'deploy.md', created: '2026-03-01T08:00:00Z', completed: '2026-03-05T10:00:00Z' },
  ],
  'project-beta': [
    { id: 'T-006', title: 'Research new features', status: 'in-progress', priority: 'medium', parentId: null, specFile: 'feature_research.md', created: '2026-03-01T14:00:00Z', completed: null },
    { id: 'T-007', title: 'Refactor old code', status: 'todo', priority: 'high', parentId: null, specFile: 'code_refactor.md', created: '2026-03-02T09:00:00Z', completed: null },
    { id: 'T-008', title: 'Prepare presentation', status: 'completed', priority: 'low', parentId: null, specFile: 'presentation.md', created: '2026-03-03T11:00:00Z', completed: '2026-03-04T12:00:00Z' },
  ],
};

// API endpoint to get projects
app.get('/api/web/projects', (req, res) => {
  console.log('Received request for /api/web/projects');
  res.json({ activeProject: mockProjects[0].id, projects: mockProjects });
});

// API endpoint to get tasks for a specific project
app.get('/api/web/projects/:projectName/tasks', (req, res) => {
  const projectName = req.params.projectName;
  console.log(`Received request for tasks for project: ${projectName}`);
  const tasks = mockTasks[projectName] || [];
  res.json({ project: projectName, tasks: tasks, taskContext: `Context for ${projectName} tasks.` });
});

// Existing API endpoint to simulate sending a command and getting a status
app.get('/api/status', (req, res) => {
  console.log('Received request for /api/status');
  const DASHBOARD_ACCESS_TOKEN = process.env.DASHBOARD_ACCESS_TOKEN;

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
