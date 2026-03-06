## 🔄 Workflow Rules
* **TODO (`[ ]`)**: Task is queued.
* **IN DEVELOPMENT (`[~]`)**: Jarvis or a Subagent is currently working on this.
* **IN REVIEW (`[?]`)**: AI has completed the work. Awaiting review from **Andrew**.
* **COMPLETE (`[x]`)**: Andrew has approved the work.
* *Note: Only Andrew can mark a task as `[x] COMPLETE` or kick it back to `[~] IN DEVELOPMENT`.*

### 📝 Review Notes (Feedback Loop)
When pushing a task back to `[~] IN DEVELOPMENT`, Andrew will add a sub-bullet with his review notes so the agents have exact context on what to fix.

## Tasks
- [X] Initial setup and configuration
- [X] Research and resolve 'express' module not found error in Docker build
- [X] Implement Dockerfile changes based on research findings
- [X] Develop a web GUI for interacting with the AgentFlowboard
- [X] Investigate and resolve dashboard redirect forcing Telegram access
- [X] Configure web-gui to send WEB_GUI_ACCESS_TOKEN header
- [X] Resolve web-gui port conflict by updating docker-compose to port 3004
- [X] Replicate Telegram Dashboard UI/UX and core functionalities in Web GUI (Phase 1: UI/UX & Structure)

### Phase 2: Dark Theme, Real Data Integration & Enhanced Navigation
- [X] Task 2.1: Implement Dark Theme in `web-gui/public/style.css`
- [X] Task 2.2: Implement direct file system access for project/task data in `web-gui/server.js`
- [X] Task 2.3: Functional Navigation in `web-gui/public/script.js`

### Phase 3: Project & Task Management (Full CRUD)
- [X] Task 3.1: Integrate Project List with Real Data
- [X] Task 3.2: Integrate Task List with Real Data
- [X] Task 3.3: Project/Task Creation Forms
- [?] Task 3.4: Project/Task Editing & Deletion
- [ ] Task 3.5: Establish Web GUI as Primary Project Data Source (replace .md files)

### Phase X: Database Integration (SQLite)
- [X] Task X.1: Design Database Schema
- [X] Task X.2: Integrate SQLite into `web-gui/server.js`
- [?] Task X.3: Migrate Existing Data (Initial Load)
- [X] Task X.4: Update `docker-compose.yml` for Database Persistence

### Urgent Bug Fixes
- [X] Fix SyntaxError: Invalid or unexpected token at `web-gui/server.js` line 376