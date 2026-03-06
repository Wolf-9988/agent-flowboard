const express = require('express');
const path = require('path');
const fs = require('fs');

// Define base paths for existing project data on the file system
const BASE_DIR = path.join(__dirname, '..', '..', '..', '..'); // Four levels up from server.js
const PROJECTS_DIR = path.join(BASE_DIR, 'projects');
const INDEX_FILE = path.join(PROJECTS_DIR, '_index.md');
const ACTIVE_PROJECT_FILE = path.join(PROJECTS_DIR, 'ACTIVE_PROJECT');


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
          FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE,
          FOREIGN KEY (from_note_id) REFERENCES Canvas_Notes(id) ON DELETE CASCADE,
          FOREIGN KEY (to_note_id) REFERENCES Canvas_Notes(id) ON DELETE CASCADE
        );
      `);
      // Initial project setup if no projects exist
      db.get("SELECT COUNT(*) as count FROM Projects", async (err, row) => {
        if (err) {
          console.error("Error checking for existing projects:", err.message);
          return;
        }
        if (row.count === 0) {
          console.log("No projects found in DB. Initiating data migration from filesystem.");
          try {
            await migrateDataToSQLite();
          } catch (migrationError) {
            console.error("Error during data migration:", migrationError.message);
            // Fallback to inserting default project if migration fails or no projects were found in filesystem
            console.log("Attempting to insert default project as migration failed or found no data.");
            db.run("INSERT INTO Projects (name, displayName, status, description, is_active) VALUES (?, ?, ?, ?, ?)",
              ['agentflowboard', 'AgentFlowboard', 'active', 'The main project for AgentFlowboard operations.', 1],
              function (insertErr) {
                if (insertErr) {
                  console.error("Error inserting default project after migration attempt:", insertErr.message);
                } else {
                  console.log(`Default project 'AgentFlowboard' created with ID: ${this.lastID}`);
                }
              }
            );
          }
        } else {
          console.log(`Found ${row.count} projects in DB. Skipping migration.`);
        }
      });
    });
  }
});

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Helper to read and parse _index.md for project data
function parseIndexMd() {
  if (!fs.existsSync(INDEX_FILE)) {
    console.warn(`_index.md not found at ${INDEX_FILE}. Returning empty array.`);
    return [];
  }
  const indexContent = fs.readFileSync(INDEX_FILE, 'utf8');
  const lines = indexContent.split('\n').map(line => line.trim()).filter(line => line.startsWith('|') && !line.startsWith('|-'));

  if (lines.length < 1) { // Only header, no data
    return [];
  }

  const projects = [];
  // Skip header and separator, start from actual project data
  for (let i = 1; i < lines.length; i++) { // Start from 1 to skip the header line
    const parts = lines[i].split('|').map(part => part.trim()).filter(part => part !== '');
    if (parts.length >= 3) {
      projects.push({
        name: parts[0],
        status: parts[1],
        description: parts[2],
        displayName: parts[2].split(' - ')[0] || parts[0] // Simple heuristic for displayName
      });
    }
  }
  return projects;
}

// Helper to read tasks.json for a given project
function readTasksFile(projectName) {
  const tasksFilePath = path.join(PROJECTS_DIR, projectName, 'tasks.json');
  if (!fs.existsSync(tasksFilePath)) {
    console.warn(`tasks.json not found for project ${projectName} at ${tasksFilePath}. Returning empty tasks.`);
    return { tasks: [] };
  }
  const tasksContent = fs.readFileSync(tasksFilePath, 'utf8');
  return JSON.parse(tasksContent);
}

// Helper to read the active project from ACTIVE_PROJECT_FILE
function readActiveProject() {
  if (fs.existsSync(ACTIVE_PROJECT_FILE)) {
    return fs.readFileSync(ACTIVE_PROJECT_FILE, 'utf8').trim();
  }
  return null; // No active project defined
}

// Helper to get task counts (open, in-progress, completed) for a project
function getTaskCounts(projectName) {
  try {
    const data = readTasksFile(projectName);
    const tasks = data.tasks;
    const counts = { open: 0, 'in-progress': 0, completed: 0 };
    tasks.forEach(task => {
      if (counts[task.status] !== undefined) {
        counts[task.status]++;
      }
    });
    return counts;
  } catch (error) {
    console.error(`Error getting task counts for project ${projectName}:`, error.message);
    return { open: 0, 'in-progress': 0, completed: 0 };
  }
}

const DASHBOARD_ACCESS_TOKEN = process.env.DASHBOARD_ACCESS_TOKEN; // Still needed for /api/status endpoint




// Promise-based wrappers for SQLite operations
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

async function migrateDataToSQLite() {
  console.log('Starting data migration to SQLite...');
  const fileSystemProjects = parseIndexMd();
  const activeProjectName = readActiveProject();

  const projectIdMap = new Map(); // Maps filesystem project name to SQLite project ID
  const taskIdMap = new Map(); // Maps filesystem task ID to SQLite task ID for a given project

  // Pass 1: Insert Projects
  for (const project of fileSystemProjects) {
    const is_active = (project.name === activeProjectName) ? 1 : 0;
    try {
      const projectId = await runQuery(
        `INSERT INTO Projects (name, displayName, status, description, is_active) VALUES (?, ?, ?, ?, ?)`,
        [project.name, project.displayName, project.status, project.description, is_active]
      );
      projectIdMap.set(project.name, projectId);
      console.log(`Migrated project: ${project.name} (ID: ${projectId})`);
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        console.warn(`Project '${project.name}' already exists in DB, attempting to retrieve ID.`);
        const existingProject = await getQuery(`SELECT id FROM Projects WHERE name = ?`, [project.name]);
        if (existingProject) {
          projectIdMap.set(project.name, existingProject.id);
        } else {
          console.error(`Error retrieving existing project ID for '${project.name}':`, err.message);
        }
      } else {
        console.error(`Error migrating project ${project.name}:`, err.message);
      }
    }
  }

  // Pass 2: Insert Tasks and populate taskIdMap
  for (const project of fileSystemProjects) {
    const projectId = projectIdMap.get(project.name);
    if (!projectId) {
      console.warn(`Could not find project ID for '${project.name}', skipping tasks migration.`);
      continue;
    }

    const fileSystemTasksData = readTasksFile(project.name);
    if (!fileSystemTasksData || !fileSystemTasksData.tasks) {
      continue;
    }

    for (const task of fileSystemTasksData.tasks) {
      try {
        const taskId = await runQuery(
          `INSERT INTO Tasks (project_id, title, priority, status, created_at) VALUES (?, ?, ?, ?, ?)`,
          [projectId, task.title, task.priority, task.status || 'open', task.createdAt || new Date().toISOString()]
        );
        // Store mapping as 'projectName-originalTaskId' -> newDbTaskId
        taskIdMap.set(`${project.name}-${task.id}`, taskId);
        console.log(`Migrated task: ${task.title} (ID: ${taskId}) for project ${project.name}`);
      } catch (err) {
        console.error(`Error migrating task '${task.title}' for project '${project.name}':`, err.message);
      }
    }
  }

  // Pass 3: Update parent_task_id for subtasks
  for (const project of fileSystemProjects) {
    const fileSystemTasksData = readTasksFile(project.name);
    if (!fileSystemTasksData || !fileSystemTasksData.tasks) {
      continue;
    }

    for (const task of fileSystemTasksData.tasks) {
      if (task.parentTask) {
        const currentDbTaskId = taskIdMap.get(`${project.name}-${task.id}`);
        const parentDbTaskId = taskIdMap.get(`${project.name}-${task.parentTask}`);

        if (currentDbTaskId && parentDbTaskId) {
          try {
            await runQuery(
              `UPDATE Tasks SET parent_task_id = ? WHERE id = ?`,
              [parentDbTaskId, currentDbTaskId]
            );
            console.log(`Updated parent for task '${task.title}' (DB ID: ${currentDbTaskId}) to parent DB ID: ${parentDbTaskId}`);
          } catch (err) {
            console.error(`Error updating parent for task '${task.title}':`, err.message);
          }
        } else {
          console.warn(`Could not find DB IDs for task '${task.title}' (original ID: ${task.id}) or its parent '${task.parentTask}' in project '${project.name}', skipping parent update.`);
        }
      }
    }
  }

  console.log('Data migration to SQLite complete.');
}

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
