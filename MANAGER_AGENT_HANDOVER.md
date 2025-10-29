# ShopShadow - Manager Agent Handover Prompt

**Session Handover** | Use this to continue APM orchestration in a new Claude Code session

---

## Current Project State

**Project:** ShopShadow - Automated checkout system with YOLO11s computer vision
**Workspace:** `/Users/aneshkondor/Coding/cursor_projects/ShopShadow`
**GitHub:** https://github.com/aneshkondor/ShopShadow.git
**APM Strategy:** Dynamic-md Memory System
**Implementation Plan:** `apm/Implementation_Plan.md` (36 tasks, 10 agents)

---

## Completed Work

### ✅ Phase 1 - Foundation (6/6 tasks complete)
- Monorepo structure established
- PostgreSQL schema with 8 tables, 32 indexes
- Database migrations (node-pg-migrate)
- Seed data (15 products, 2 demo users)
- Environment templates (.env.example)
- Shared logging infrastructure (Winston/Python)
- Memory: `apm/Memory/Phase_01_Foundation/`

### ✅ Phase 2 - Backend API Core (8/8 tasks complete)
- Express server with middleware stack
- JWT authentication (bcrypt + tokens)
- Product catalog API (public + admin CRUD)
- Device pairing system (4-digit codes)
- Basket state management (Flask integration endpoints)
- Low-confidence approval workflow (<70% confidence - NEW FEATURE)
- Order/checkout API with transactions
- Admin dashboard (users, orders, analytics, product stats)
- Memory: `apm/Memory/Phase_02_Backend_API_Core/`

**All commits pushed to GitHub main branch** ✅

---

## Next Phase: Phase 3 - Flask Detection Service

**6 tasks total** across Agent_Detection:

1. **Task 3.1** - Set up Flask application structure with camera integration
2. **Task 3.2** - Implement YOLO11s model loading and inference
3. **Task 3.3** - Create detection loop with confidence thresholding
4. **Task 3.4** - Build backend API client for basket/pending submission
5. **Task 3.5** - Implement device registration on startup
6. **Task 3.6** - Integrate logging and create orchestration script

**Dependencies:**
- Phase 2 backend endpoints (✅ complete)
- Shared Python logger from Task 1.6 (✅ available)
- COCO-to-product mapping (to be created in Task 3.2)

---

## APM Workflow (Proven Pattern)

### For Each Task:

1. **Read Implementation Plan** (`apm/Implementation_Plan.md`) for task details
2. **Create Task Assignment Prompt** from plan's meta-fields
3. **Assign to Implementation Agent** (new Claude Code or Cursor session)
4. **Agent commits locally** (don't push yet)
5. **After all phase tasks done:**
   - Review Memory Logs
   - Push all commits together
   - Create phase summary in `Memory_Root.md`

### Model Recommendations:

**Sonnet 4.5 for:**
- Complex architecture (Task 3.3 detection loop, Task 3.6 orchestration)
- Critical integration points (Task 3.4 backend communication)

**Haiku for:**
- Straightforward implementations (Task 3.1 Flask setup)
- Standard patterns (Task 3.2 YOLO loading)

**Cursor + GPT-4 for:**
- Files >300 lines (not applicable in Phase 3)

---

## Key Technical Context

### Critical Decisions from Phases 1-2:

**Inter-Service Communication:**
- Flask → Backend REST API (POST /api/basket/items, POST /api/basket/pending-items)
- Frontend → Backend (5-second polling)
- No WebSocket (polling chosen for simplicity)

**Low-Confidence Approval Workflow (NEW):**
- Detections <70% → pending_items table
- User approves/declines via frontend (Phase 4)
- Frontend UI needed (not in original design)

**Database Approach:**
- PostgreSQL (not in-memory) for multi-device support
- basket_items and pending_items tables persist across refreshes

**Detection Strategy:**
- YOLO11s on COCO dataset (80 classes)
- Camera: MacBook webcam (index 0) for MVP, USB for Pi
- Quantity detection: Count multiple instances (3 apples → quantity=3)
- Mapping: COCO class IDs → ShopShadow product IDs

**Logging:**
- Per-run log files: `shopshadow-YYYY-MM-DD-HH-mm-ss.log`
- Shared logger: `shared/logger.js` (Winston), `shared/logger.py`
- Both console + file output

---

## Memory System

**Root:** `apm/Memory/Memory_Root.md`
**Phase Folders:** Created as needed (Phase 1 & 2 exist)
**Task Logs:** `Phase_XX_<slug>/Task_XX_<slug>.md`

**Format:** Markdown with YAML frontmatter (agent, task_ref, status, model, date)

---

## Starting Phase 3

### Step 1: Prepare Memory System

```bash
mkdir -p apm/Memory/Phase_03_Flask_Detection_Service
cd apm/Memory/Phase_03_Flask_Detection_Service
touch Task_3_1_Flask_app_camera_setup.md \
      Task_3_2_YOLO_model_inference.md \
      Task_3_3_Detection_loop_thresholding.md \
      Task_3_4_Backend_API_client.md \
      Task_3_5_Device_registration.md \
      Task_3_6_Logging_orchestration.md
```

### Step 2: Read Implementation Plan

Read `apm/Implementation_Plan.md` starting at line 205 (Phase 3 begins)

### Step 3: Create Task Assignment Prompts

Generate detailed prompts for each task using Implementation Plan meta-fields (Objective, Output, Guidance, Detailed Sub-Tasks).

**Pattern:** See `TASK_ASSIGNMENTS_PHASE_2_TEMP.md` for reference structure.

### Step 4: Execute Tasks

Assign to Agent_Detection (all 6 tasks can potentially run in parallel if dependencies clear).

---

## Important Notes

**Demo Credentials:**
- User: demo@email.com / 1234
- Admin: admin@email.com / 1111

**Frontend Already Exists:**
- Complete React app at `frontend/`
- API spec: `frontend/src/03-api-endpoints-and-data.md`
- Phase 4 will enhance (not build from scratch)

**Existing Pi Code:**
- Reference: `ShopShadow-PI/` (untracked)
- Use as reference but implement fresh in `flask-detection/`

**User Requirement:**
> "Document EVERYTHING" - `.md-explanations/` for file-by-file code docs

---

## Handover Checklist

- ✅ Phase 1 complete (6/6 tasks)
- ✅ Phase 2 complete (8/8 tasks)
- ✅ All commits pushed to GitHub
- ✅ Memory Logs populated for all 14 tasks
- ✅ Phase summaries in Memory_Root.md
- ⏳ Phase 3 ready to begin (6 tasks)
- ⏳ Phase 4 awaiting (6 tasks - Frontend enhancement)
- ⏳ Phase 5 awaiting (5 tasks - Testing)
- ⏳ Phase 6 awaiting (5 tasks - Documentation/Deployment)

**Total Progress:** 14/36 tasks complete (39%)

---

## Quick Start Commands

```bash
# Navigate to project
cd /Users/aneshkondor/Coding/cursor_projects/ShopShadow

# Check git status
git status

# View Memory Root
cat apm/Memory/Memory_Root.md

# Read Implementation Plan Phase 3
sed -n '205,293p' apm/Implementation_Plan.md

# Start new Claude Code session with this prompt
```

---

**You are now the Manager Agent for ShopShadow APM. Begin with Phase 3 Flask Detection Service (6 tasks).** Good luck! 🚀
