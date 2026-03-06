document.addEventListener('DOMContentLoaded', () => {
    const testCommandBtn = document.getElementById('testCommandBtn');
    const statusResult = document.getElementById('statusResult');
    const projectList = document.getElementById('projectList');
    const taskList = document.getElementById('taskList');
    const currentProjectNameSpan = document.getElementById('currentProjectName');
    const tasksProjectNameSpan = document.getElementById('tasksProjectName');

    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.dashboard-content section.card');

    let currentProject = null;

    // --- Section Visibility Control ---
    function showSection(sectionIds) {
        // Hide all sections first
        contentSections.forEach(section => section.classList.add('hidden'));

        // Show specified sections
        sectionIds.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                section.classList.remove('hidden');
            }
        });

        // Update active class on nav links
        navLinks.forEach(link => link.classList.remove('active'));
        // Find the link that corresponds to one of the shown sections for activating it
        // For simplicity, let's activate the 'Dashboard' link if 'status-section' is shown
        // or 'Projects' if 'projects-section' is shown, etc.
        if (sectionIds.includes('status-section')) {
            document.querySelector('.nav-link[href="#Dashboard"]').classList.add('active');
        } else if (sectionIds.includes('projects-section')) {
            document.querySelector('.nav-link[href="#Projects"]').classList.add('active');
        } else if (sectionIds.includes('file-explorer-section')) {
            document.querySelector('.nav-link[href="#Files"]').classList.add('active');
        } else if (sectionIds.includes('canvas-view-section')) {
            document.querySelector('.nav-link[href="#Canvas"]').classList.add('active');
        }
    }

    // --- Navigation Event Listeners ---
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const targetHref = link.getAttribute('href');
            // Remove '#' prefix and determine target section(s)
            const targetId = targetHref.substring(1);

            switch (targetId) {
                case 'Dashboard':
                    showSection(['status-section', 'projects-section', 'tasks-section', 'control-buttons-section']);
                    // Re-fetch projects and tasks if on dashboard view
                    fetchProjects();
                    break;
                case 'Projects':
                    showSection(['projects-section', 'tasks-section']);
                    fetchProjects(); // Ensure projects are loaded
                    break;
                case 'Files':
                    showSection(['file-explorer-section']);
                    // Future: fetchFiles() for file explorer
                    break;
                case 'Canvas':
                    showSection(['canvas-view-section']);
                    // Future: fetchCanvas() for canvas view
                    break;
                default:
                    console.warn(`Unhandled navigation link: ${targetId}`);
                    break;
            }
        });
    });

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

    // --- Project & Task Functionality ---

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
            if (data.activeProject && currentProject === null) { // Only load initially if no project selected yet
                fetchTasks(data.activeProject);
            } else if (currentProject) {
                // If a project is already selected (e.g., from previous navigation), re-fetch its tasks
                fetchTasks(currentProject);
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

    // Initial load: show the dashboard section and fetch projects
    showSection(['status-section', 'projects-section', 'tasks-section', 'control-buttons-section']);
    fetchProjects();
});