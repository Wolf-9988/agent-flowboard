const express = require('express');
const path = require('path');
const fs = require('fs'); // Added fs module
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Define PROJECTS_DIR for direct file access
// Adjusted WORKSPACE to point to /workspace so that projects directory is accessible
const WORKSPACE = process.env.OPENCLAW_WORKSPACE || path.resolve(__dirname, '..', '..', '..', '..' ); 
const PROJECTS_DIR = path.join(WORKSPACE, 'projects');
const INDEX_FILE = path.join(PROJECTS_DIR, '_index.md');

const DASHBOARD_ACCESS_TOKEN = process.env.DASHBOARD_ACCESS_TOKEN; // Still needed for /api/status endpoint

// --- Helper Functions (copied and adapted from dashboard/server.js for direct file access) ---

function getDisplayName(projectName) {
  try {
    const mdPath = path.join(PROJECTS_DIR, projectName, 'PROJECT.md');
    const firstLine = fs.readFileSync(mdPath, 'utf8').split('\n')[0];
    let title = firstLine.replace(/^#\s*/, '').trim();
    title = title.split(/\s*[—–]\s*/)[0].trim(); // Strip subtitle
    return title || projectName;
  } catch (e) { console.warn(`Could not read PROJECT.md for ${projectName}:`, e.message); return projectName; }
}

function parseIndexMd() {
  try {
    const text = fs.readFileSync(INDEX_FILE, 'utf8');
    const lines = text.split('\n');
    const projects = [];
    for (const line of lines) {
      const match = line.match(/^\|\s*(\w[\w-]*)\s*\|\s*(\w+)\s*\|\s*(.+?)\s*\|$/);
      if (match && match[1] !== 'Project') {
        projects.push({
          name: match[1],
          displayName: getDisplayName(match[1]),
          status: match[2],
          description: match[3]
        });
      }
    }
    return projects;
  } catch (e) { console.warn(`Could not read _index.md:`, e.message); return []; }
}

function readTasksFile(projectName) {
  const file = path.join(PROJECTS_DIR, projectName, 'tasks.json');
  try {
    // Ensure the file exists before trying to read
    if (!fs.existsSync(file)) {
      console.warn(`tasks.json not found for project: ${projectName}`);
      return { tasks: [] }; // Return empty tasks if file not found
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) { console.warn(`Could not read tasks.json for ${projectName}:`, e.message); return { tasks: [] }; }
}

function getTaskCounts(projectName) {
  const data = readTasksFile(projectName);
  const counts = { open: 0, 'in-progress': 0, review: 0, done: 0 };
  if (data && data.tasks) {
    for (const t of data.tasks) {
      if (counts[t.status] !== undefined) counts[t.status]++;
    }
  }
  return counts;
}

// --- API Endpoints ---

// API endpoint to get projects (now directly from filesystem)
app.get('/api/web/projects', (req, res) => {
  console.log('Received request for /api/web/projects (from filesystem)');
  try {
    const projects = parseIndexMd().map(p => ({
      ...p,
      taskCounts: getTaskCounts(p.name)
    }));
    // Dynamically determine active project from ACTIVE_PROJECT_FILE
    const activeProject = readActiveProject();
    res.json({ activeProject: activeProject, projects: projects });
  } catch (error) {
    console.error('Error reading projects from filesystem:', error.message);
    res.status(500).json({ error: 'Failed to read projects', details: error.message });
  }
});

// API endpoint to get tasks for a specific project (now directly from filesystem)
app.get('/api/web/projects/:projectName/tasks', (req, res) => {
  const projectName = req.params.projectName;
  console.log(`Received request for tasks for project: ${projectName} (from filesystem)`);
  try {
    const data = readTasksFile(projectName);
    if (!data) {
      console.warn(`No tasks data found for project: ${projectName}`);
      return res.status(404).json({ error: 'Project not found or has no tasks' });
    }
    res.json({ project: projectName, tasks: data.tasks, taskContext: `Context for ${projectName} tasks.` });
  } catch (error) {
    console.error(`Error reading tasks for project ${projectName} from filesystem:`, error.message);
    res.status(500).json({ error: `Failed to read tasks for project ${projectName}`, details: error.message });
  }
});

// Existing API endpoint to simulate sending a command and getting a status
// This still uses the token for demonstration, as it's not directly tied to file access.
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

// --- Helper function for active project (from dashboard/server.js) ---
function readActiveProject() {
  try {
    const text = fs.readFileSync(ACTIVE_PROJECT_FILE, 'utf8');
    const match = text.match(/^project:\s*(.+)$/m);
    const name = match ? match[1].trim() : 'none';
    return name === 'none' ? null : name;
  } catch { return null; }
}

app.listen(PORT, () => {
  console.log(`Web GUI server listening on port ${PORT}`);
});
