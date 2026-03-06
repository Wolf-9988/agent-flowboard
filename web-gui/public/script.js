document.addEventListener('DOMContentLoaded', () => {
    const testCommandBtn = document.getElementById('testCommandBtn');
    const statusResult = document.getElementById('statusResult');
    const projectList = document.getElementById('projectList');
    const taskList = document.getElementById('taskList');
    const currentProjectNameSpan = document.getElementById('currentProjectName');
    const tasksProjectNameSpan = document.getElementById('tasksProjectName');

    let currentProject = null;

    // --- Existing Status & Command Functionality ---
    testCommandBtn.addEventListener('click', async () => {
        statusResult.textContent = 'Sending command...';
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            statusResult.textContent = JSON.stringify(data, null, 2);
        } catch (error) {
            statusResult.textContent = `Error: ${error.message}`;
            console.error('Error fetching status:', error);
        }
    });

    // --- New Project & Task Functionality ---

    // Function to fetch and display projects
    async function fetchProjects() {
        try {
            const response = await fetch('/api/web/projects');
            const data = await response.json();
            console.log('Projects data:', data);

            currentProjectNameSpan.textContent = data.activeProject || 'None';
            projectList.innerHTML = ''; // Clear existing list

            data.projects.forEach(project => {
                const listItem = document.createElement('li');
                listItem.textContent = `
                    ${project.name} (${project.status})
                    Tasks: ${project.taskCounts.total} (Completed: ${project.taskCounts.completed})
                `;
                listItem.dataset.projectName = project.id; // Store project ID for task fetching
                listItem.addEventListener('click', () => fetchTasks(project.id));
                projectList.appendChild(listItem);
            });

            // Automatically load tasks for the active project if available
            if (data.activeProject) {
                fetchTasks(data.activeProject);
            }

        } catch (error) {
            projectList.innerHTML = `<li>Error loading projects: ${error.message}</li>`;
            console.error('Error fetching projects:', error);
        }
    }

    // Function to fetch and display tasks for a given project
    async function fetchTasks(projectName) {
        currentProject = projectName;
        tasksProjectNameSpan.textContent = projectName; // Update tasks section header
        taskList.innerHTML = '<li>Loading tasks...</li>'; // Show loading state

        try {
            const response = await fetch(`/api/web/projects/${projectName}/tasks`);
            const data = await response.json();
            console.log(`Tasks for ${projectName}:`, data);

            taskList.innerHTML = ''; // Clear existing tasks
            if (data.tasks && data.tasks.length > 0) {
                data.tasks.forEach(task => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${task.title} (Status: ${task.status}, Priority: ${task.priority})`;
                    taskList.appendChild(listItem);
                });
            } else {
                taskList.innerHTML = '<li>No tasks found for this project.</li>';
            }
        } catch (error) {
            taskList.innerHTML = `<li>Error loading tasks: ${error.message}</li>`;
            console.error(`Error fetching tasks for ${projectName}:`, error);
        }
    }

    // Initial load
    fetchProjects();
});