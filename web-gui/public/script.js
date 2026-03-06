document.addEventListener('DOMContentLoaded', () => {
    const testCommandBtn = document.getElementById('testCommandBtn');
    const statusResult = document.getElementById('statusResult');
    const projectList = document.getElementById('projectList');
    const taskList = document.getElementById('taskList');
    const currentProjectNameSpan = document.getElementById('currentProjectName');
    const tasksProjectNameSpan = document.getElementById('tasksProjectName');

    // New elements for modals
    const newProjectBtn = document.getElementById('newProjectBtn');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const newProjectModal = document.getElementById('newProjectModal');
    const newTaskModal = document.getElementById('newTaskModal');
    const cancelNewProjectBtn = document.getElementById('cancelNewProject');
    const cancelNewTaskBtn = document.getElementById('cancelNewTask');
    const newProjectForm = document.getElementById('newProjectForm');
    const projectNameInput = document.getElementById('projectNameInput');
    const projectDescriptionInput = document.getElementById('projectDescriptionInput');
    const newTaskForm = document.getElementById('newTaskForm');
    const taskTitleInput = document.getElementById('taskTitleInput');
    const taskPriorityInput = document.getElementById('taskPriorityInput');
    const taskParentInput = document.getElementById('taskParentInput');
    const newTaskProjectNameSpan = document.getElementById('newTaskProjectName');

    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.dashboard-content section.card');

    let currentProject = null;

    // Helper functions for modals
    function showModal(modalElement) {
        modalElement.classList.remove('hidden');
    }

    function hideModal(modalElement) {
        modalElement.classList.add('hidden');
    }

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

    // Event Listeners for showing modals
    newProjectBtn.addEventListener('click', () => {
        showModal(newProjectModal);
        projectNameInput.value = ''; // Clear form fields
        projectDescriptionInput.value = '';
    });

    addTaskBtn.addEventListener('click', async () => {
        if (!currentProject) {
            alert('Please select a project first.');
            return;
        }
        newTaskProjectNameSpan.textContent = currentProject;
        taskTitleInput.value = '';
        taskPriorityInput.value = 'medium';
        taskParentInput.innerHTML = '<option value="">None</option>'; // Clear and add default

        try {
            const response = await fetch(`/api/web/projects/${currentProject}/tasks`);
            const data = await response.json();
            if (data.tasks && data.tasks.length > 0) {
                data.tasks.forEach(task => {
                    const option = document.createElement('option');
                    option.value = task.id;
                    option.textContent = task.title;
                    taskParentInput.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading tasks for parent task dropdown:', error);
        }
        showModal(newTaskModal);
    });

    // Event Listeners for hiding modals
    cancelNewProjectBtn.addEventListener('click', () => {
        hideModal(newProjectModal);
    });

    cancelNewTaskBtn.addEventListener('click', () => {
        hideModal(newTaskModal);
    });

    // Form submission for new project
    newProjectForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const projectName = projectNameInput.value.trim();
        const projectDescription = projectDescriptionInput.value.trim();

        if (!projectName) {
            alert('Project Name cannot be empty.');
            return;
        }

        try {
            const response = await fetch('/api/web/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectName, projectDescription })
            });

            if (response.ok) {
                alert('Project created successfully!');
                hideModal(newProjectModal);
                fetchProjects(); // Refresh project list
            } else {
                const errorData = await response.json();
                alert(`Error creating project: ${errorData.error}`);
            }
        } catch (error) {
            alert(`Failed to create project: ${error.message}`);
            console.error('Error creating project:', error);
        }
    });

    // Form submission for new task
    newTaskForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const taskTitle = taskTitleInput.value.trim();
        const taskPriority = taskPriorityInput.value;
        const parentTask = taskParentInput.value || null; // Use null if no parent selected

        if (!taskTitle) {
            alert('Task Title cannot be empty.');
            return;
        }

        if (!currentProject) {
            alert('No project selected to add tasks to.');
            return;
        }

        try {
            const response = await fetch(`/api/web/projects/${currentProject}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskTitle, taskPriority, parentTask })
            });

            if (response.ok) {
                alert('Task created successfully!');
                hideModal(newTaskModal);
                fetchTasks(currentProject); // Refresh task list for current project
            } else {
                const errorData = await response.json();
                alert(`Error creating task: ${errorData.error}`);
            }
        } catch (error) {
            alert(`Failed to create task: ${error.message}`);
            console.error('Error creating task:', error);
        }
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

            if (data.projects.length > 0) {
                addTaskBtn.disabled = false;
            } else {
                addTaskBtn.disabled = true;
            }

            data.projects.forEach(project => {
                const listItem = document.createElement('li');
                const totalTasks = project.taskCounts.open + project.taskCounts['in-progress'] + project.taskCounts.review + project.taskCounts.done;
                const completedTasks = project.taskCounts.done;
                listItem.innerHTML = `
                    <strong>${project.displayName || project.name}</strong> (${project.status})<br>
                    <small>Tasks: ${totalTasks} (Completed: ${completedTasks})</small>
                `;
                listItem.dataset.projectName = project.name; // Store project name for task fetching
                listItem.addEventListener('click', () => {
                    fetchTasks(project.name);
                    // Highlight selected project
                    document.querySelectorAll('#projectList li').forEach(item => item.classList.remove('selected'));
                    listItem.classList.add('selected');
                });
                projectList.appendChild(listItem);
            });

            // Automatically load tasks for the active project if available
            if (data.activeProject && currentProject === null) { // Only load initially if no project selected yet
                fetchTasks(data.activeProject);
                // Also highlight the active project in the list
                const activeProjectListItem = document.querySelector(`[data-project-name="${data.activeProject}"]`);
                if (activeProjectListItem) {
                    activeProjectListItem.classList.add('selected');
                }
            } else if (currentProject) {
                // If a project is already selected (e.g., from previous navigation), re-fetch its tasks
                fetchTasks(currentProject);
                const selectedProjectListItem = document.querySelector(`[data-project-name="${currentProject}"]`);
                if (selectedProjectListItem) {
                    selectedProjectListItem.classList.add('selected');
                }
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

    // Edit Project Modal
    const editProjectModal = document.getElementById('editProjectModal');
    const cancelEditProjectBtn = document.getElementById('cancelEditProject');
    const editProjectForm = document.getElementById('editProjectForm');
    const editProjectNameInput = document.getElementById('editProjectNameInput');
    const editProjectDescriptionInput = document.getElementById('editProjectDescriptionInput');
    let editingProjectId = null;

    cancelEditProjectBtn.addEventListener('click', () => hideModal(editProjectModal));

    editProjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const displayName = editProjectNameInput.value.trim();
        const description = editProjectDescriptionInput.value.trim();
        if (!displayName || !description) {
            alert('Project name and description cannot be empty.');
            return;
        }
        try {
            const response = await fetch(`/api/web/projects/${editingProjectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayName, description }),
            });
            if (response.ok) {
                hideModal(editProjectModal);
                fetchProjects();
            } else {
                const error = await response.json();
                alert(`Error updating project: ${error.message}`);
            }
        } catch (error) {
            console.error('Failed to update project:', error);
            alert('Failed to update project.');
        }
    });

    // Edit Task Modal
    const editTaskModal = document.getElementById('editTaskModal');
    const cancelEditTaskBtn = document.getElementById('cancelEditTask');
    const editTaskForm = document.getElementById('editTaskForm');
    const editTaskTitleInput = document.getElementById('editTaskTitleInput');
    const editTaskPriorityInput = document.getElementById('editTaskPriorityInput');
    const editTaskStatusInput = document.getElementById('editTaskStatusInput');
    let editingTaskId = null;

    cancelEditTaskBtn.addEventListener('click', () => hideModal(editTaskModal));

    editTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = editTaskTitleInput.value.trim();
        const priority = editTaskPriorityInput.value;
        const status = editTaskStatusInput.value;
        if (!title) {
            alert('Task title cannot be empty.');
            return;
        }
        try {
            const response = await fetch(`/api/web/tasks/${editingTaskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, priority, status }),
            });
            if (response.ok) {
                hideModal(editTaskModal);
                fetchTasks(currentProject);
            } else {
                const error = await response.json();
                alert(`Error updating task: ${error.message}`);
            }
        } catch (error) {
            console.error('Failed to update task:', error);
            alert('Failed to update task.');
        }
    });

    // Delegated event listeners for edit/delete buttons
    projectList.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const projectItem = e.target.closest('li');
            editingProjectId = projectItem.dataset.projectId;
            editProjectNameInput.value = projectItem.dataset.projectName;
            editProjectDescriptionInput.value = projectItem.dataset.projectDescription;
            showModal(editProjectModal);
        }
        if (e.target.classList.contains('delete-btn')) {
            const projectItem = e.target.closest('li');
            const projectId = projectItem.dataset.projectId;
            if (confirm(`Are you sure you want to delete project ${projectItem.dataset.projectName}?`)) {
                fetch(`/api/web/projects/${projectId}`, { method: 'DELETE' })
                    .then(response => {
                        if(response.ok) fetchProjects();
                        else alert('Failed to delete project.');
                    });
            }
        }
    });

    taskList.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const taskItem = e.target.closest('li');
            editingTaskId = taskItem.dataset.taskId;
            editTaskTitleInput.value = taskItem.dataset.taskTitle;
            editTaskPriorityInput.value = taskItem.dataset.taskPriority;
            editTaskStatusInput.value = taskItem.dataset.taskStatus;
            showModal(editTaskModal);
        }
        if (e.target.classList.contains('delete-btn')) {
            const taskItem = e.target.closest('li');
            const taskId = taskItem.dataset.taskId;
            if (confirm(`Are you sure you want to delete task "${taskItem.dataset.taskTitle}"?`)) {
                fetch(`/api/web/tasks/${taskId}`, { method: 'DELETE' })
                    .then(response => {
                        if(response.ok) fetchTasks(currentProject);
                        else alert('Failed to delete task.');
                    });
            }
        }
    });
});