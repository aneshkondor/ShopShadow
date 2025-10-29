# ShopShadow Code Explanations

**Purpose:** Detailed file-by-file code documentation explaining WHY code exists and HOW components interact.

## User Requirement

> "Document EVERYTHING"

This directory contains comprehensive markdown explanations for each source file in the ShopShadow codebase, focusing on:

- **Why:** Business logic and design decisions behind the code
- **How:** Component interactions, data flow, and integration points
- **Context:** Dependencies, assumptions, and edge cases

## Documentation Format

Each `.md` file mirrors a source file, providing narrative explanations rather than inline comments:

```
.md-explanations/
├── backend/
│   ├── server.md           # Express server setup and middleware
│   ├── routes/
│   │   ├── auth.md         # Authentication endpoints explained
│   │   ├── products.md     # Product catalog logic
│   │   └── basket.md       # Basket state management
│   └── utils/
│       └── auth.md         # JWT and bcrypt utilities
├── flask-detection/
│   ├── main.md             # Detection loop orchestration
│   ├── models/
│   │   └── yolo_detector.md  # YOLO integration details
│   └── api/
│       └── backend_client.md  # Inter-service communication
└── shared/
    └── logger.md           # Logging infrastructure design
```

## Best Practices

- **Focus on WHY:** Explain business requirements and design decisions
- **Show Interactions:** Describe how components communicate and integrate
- **Include Examples:** Provide usage examples and common scenarios
- **Update Regularly:** Keep explanations in sync with code changes
