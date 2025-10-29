# ShopShadow Tests

**Purpose:** End-to-end and integration tests for the complete ShopShadow system.

## Test Coverage (Planned)

### Backend API Tests
- Authentication flow (signup, login, logout, token refresh)
- Product catalog operations (CRUD, search, filtering)
- Device pairing workflow (registration, connection, disconnection)
- Basket state management (add items, retrieve basket, cleanup)
- Low-confidence approval workflow (pending items, approve, decline)
- Order creation and history retrieval
- Admin endpoints (user management, analytics)

### Flask Detection Tests
- Camera capture validation
- YOLO model inference accuracy
- Confidence thresholding logic
- Quantity counting (multiple items of same class)
- COCO-to-product mapping
- Backend API communication (retry logic, error handling)
- Detection loop timing and performance

### Frontend Integration Tests
- User authentication flow
- Product catalog browsing
- Device pairing via 4-digit code
- Real-time basket updates (5-second polling)
- Low-confidence approval UI workflow
- Checkout and order completion
- Admin panel functionality

### End-to-End Tests
- Complete shopping workflow: login → pair device → detection → approval → checkout
- Multi-user scenarios (concurrent baskets)
- Error handling and edge cases (network failures, camera disconnection, etc.)

## Testing Tools (Planned)

- **Backend:** Jest, Supertest, PostgreSQL test database
- **Flask:** pytest, requests-mock, unittest.mock
- **Frontend:** Vitest, React Testing Library
- **E2E:** Playwright or Cypress
- **Load Testing:** k6 or Apache JMeter

## Directory Structure

```
tests/
├── backend/                # Backend API tests
├── flask-detection/        # Detection service tests
├── frontend/               # Frontend component/integration tests
├── e2e/                    # End-to-end user workflow tests
└── fixtures/               # Test data and mock responses
```
