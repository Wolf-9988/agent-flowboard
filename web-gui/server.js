const express = require('express');
const path = require('path');

const app = express();
app.use(express.json()); // Enable JSON body parsing

const sqlite3 = require('sqlite3').verbose();
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', '..', '..', 'data', 'agentflowboard.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
      if (pragmaErr) {
        console.error('Error enabling foreign keys:', pragmaErr.message);
      } else {
        console.log('Foreign keys enabled.');
      }
    });
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS Projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          displayName TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          description TEXT,
          is_active INTEGER DEFAULT 0
        );
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS Tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          priority TEXT NOT NULL,
          status TEXT DEFAULT 'open',
          parent_task_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES Projects(id),
          FOREIGN KEY (parent_task_id) REFERENCES Tasks(id)
        );
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS Canvas_Notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          x REAL,
          y REAL,
          width REAL,
          height REAL,
          text TEXT,
          color TEXT,
          FOREIGN KEY (project_id) REFERENCES Projects(id)
        );
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS Canvas_Connections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          from_note_id INTEGER NOT NULL,
          to_note_id INTEGER NOT NULL,
          color TEXT,
          FOREIGN KEY (project_id) REFERENCES Projects(id),
          FOREIGN KEY (from_note_id) REFERENCES Canvas_Notes(id),
          FOREIGN KEY (to_note_id) REFERENCES Canvas_Notes(id)
        );
      `);
      // Initial project setup if no projects exist
      db.get("SELECT COUNT(*) as count FROM Projects", (err, row) => {
        if (err) {
          console.error("Error checking for existing projects:", err.message);
          return;
        }
        if (row.count === 0) {
          console.log("No projects found, initializing default project.");
          db.run("INSERT INTO Projects (name, displayName, status, description, is_active) VALUES (?, ?, ?, ?, ?)",
            ['agentflowboard', 'AgentFlowboard', 'active', 'The main project for AgentFlowboard operations.', 1],
            function (err) {
              if (err) {
                console.error("Error inserting default project:", err.message);
              } else {
                console.log(`Default project 'AgentFlowboard' created with ID: ${this.lastID}`);
              }
            }
          );
        }
      });
    });
  }
});

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Define PROJECTS_DIR for direct file access
// Adjusted WORKSPACE to point to /workspace so that projects directory is accessible


const DASHBOARD_ACCESS_TOKEN = process.env.DASHBOARD_ACCESS_TOKEN; // Still needed for /api/status endpoint



// Helper to generate a unique project name
function generateUniqueProjectName(existingProjects) {
  let newProjectName = 'project-new';
  let counter = 1;
  const existingNames = new Set(existingProjects.map(p => p.name));
  while (existingNames.has(newProjectName)) {
    newProjectName = `project-new-${counter}`;
    counter++;
  }
  return newProjectName;
}

// API endpoint to create a new project
app.post('/api/web/projects', (req, res) => {
  const { projectName, projectDescription } = req.body;

  if (!projectName) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    const existingProjects = parseIndexMd();
    const newProjectSlug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-*|-*$/g, '');

    // Check for existing project with the same slug
    if (existingProjects.some(p => p.name === newProjectSlug)) {
        return res.status(409).json({ error: `Project with name "${projectName}" already exists.` });
    }

    const projectDir = path.join(PROJECTS_DIR, newProjectSlug);
    if (fs.existsSync(projectDir)) {
      return res.status(409).json({ error: `Directory for project "${projectName}" already exists.` });
    }

    fs.mkdirSync(projectDir, { recursive: true });

    // Create PROJECT.md
    const projectMdContent = `# ${projectName}

${projectDescription || 'No description provided.'}`;
    fs.writeFileSync(path.join(projectDir, 'PROJECT.md'), projectMdContent, 'utf8');

    // Create tasks.json
    fs.writeFileSync(path.join(projectDir, 'tasks.json'), JSON.stringify({ tasks: [] }, null, 2), 'utf8');

    // Update _index.md
    let indexMdContent = '';
    if (fs.existsSync(INDEX_FILE)) {
      indexMdContent = fs.readFileSync(INDEX_FILE, 'utf8');
    }

    const newProjectEntry = `| ${newProjectSlug} | active | ${projectName} - ${projectDescription || 'A new project.'} |`;
    const lines = indexMdContent.split('\n');
    let updatedIndexMd = '';
    let added = false;

    // Find where to insert, typically after the header and separator
    if (lines.length >= 2 && lines[0].startsWith('| Project') && lines[1].startsWith('|---|')) {
      updatedIndexMd = lines[0] + '\n' + lines[1] + '\n';
      for (let i = 2; i < lines.length; i++) {
        if (!added && lines[i].trim() === '') { // Insert before the first empty line or end of file
          updatedIndexMd += newProjectEntry + '\n';
          added = true;
        }
        updatedIndexMd += lines[i] + '\n';
      }
      if (!added) { // If no empty line found, add at the end
        updatedIndexMd += newProjectEntry + '\n';
      }
    } else {
      // If _index.md is empty or malformed, create a new one
      updatedIndexMd = '| Project | Status | Description |
|---|---|---|
' + newProjectEntry + '\n';
    }

    fs.writeFileSync(INDEX_FILE, updatedIndexMd.trim(), 'utf8');

    res.status(201).json({ message: 'Project created successfully', projectName: newProjectSlug });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project', details: error.message });
  }
});

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

// Helper to generate a unique task ID
function generateUniqueTaskId(tasks) {
  let newTaskId = 'T-001';
  let counter = 1;
  const existingIds = new Set(tasks.map(t => t.id));
  while (existingIds.has(newTaskId)) {
    counter++;
    newTaskId = `T-${String(counter).padStart(3, '0')}`;
  }
  return newTaskId;
}

// API endpoint to create a new task for a project
app.post('/api/web/projects/:projectName/tasks', (req, res) => {
  const projectName = req.params.projectName;
  const { taskTitle, taskPriority, parentTask } = req.body;

  if (!taskTitle || !taskPriority) {
    return res.status(400).json({ error: 'Task title and priority are required' });
  }

  try {
    const tasksFile = path.join(PROJECTS_DIR, projectName, 'tasks.json');

    let tasksData = { tasks: [] };
    if (fs.existsSync(tasksFile)) {
      tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
    }

    const newTaskId = generateUniqueTaskId(tasksData.tasks);
    const newTask = {
      id: newTaskId,
      title: taskTitle,
      priority: taskPriority,
      status: 'open', // Default status for a new task
      parentTask: parentTask || null, // Allow null for no parent task
      createdAt: new Date().toISOString()
    };

    tasksData.tasks.push(newTask);
    fs.writeFileSync(tasksFile, JSON.stringify(tasksData, null, 2), 'utf8');

    res.status(201).json({ message: 'Task created successfully', task: newTask });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task', details: error.message });
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


app.listen(PORT, () => {
  console.log(`Web GUI server listening on port ${PORT}`);
});
