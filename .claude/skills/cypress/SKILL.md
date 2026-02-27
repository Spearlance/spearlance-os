---
model: claude-sonnet-4-6
name: cypress
description: Use when working with Cypress for E2E testing, component testing, visual testing, or real-time test runner. Also use when configuring Cypress Cloud, writing custom commands, or debugging test flakiness in Cypress.
---

# Cypress

## Overview
Cypress 15.10.0 (released February 2026) is a JavaScript-based end-to-end and component testing framework that runs directly in the browser alongside your application, providing real-time reloading, time-travel debugging, and automatic waiting.

## Quick Reference

| Item | Value |
|------|-------|
| **Current Version** | 15.10.0 (February 2026) |
| **Install** | `npm install -D cypress` |
| **Config** | `cypress.config.ts` |
| **Open Runner** | `npx cypress open` |
| **Run Headless** | `npx cypress run` |
| **Component Test** | `npx cypress run --component` |
| **Node.js** | 20, 22, 24+ (18 and 23 dropped in v15) |
| **Bundled Chromium** | 136.0.7103.149 |

## Setup

```typescript
// cypress.config.ts
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.ts",
    setupNodeEvents(on, config) {
      // Node event listeners here
    },
  },
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
  },
});
```

```typescript
// cypress/e2e/home.cy.ts
describe("Home Page", () => {
  it("loads successfully", () => {
    cy.visit("/");
    cy.contains("h1", "Welcome").should("be.visible");
  });
});
```

## Common Operations

**Visit and Assert:**
```typescript
cy.visit("/dashboard");
cy.get("[data-cy=header]").should("contain", "Dashboard");
cy.url().should("include", "/dashboard");
```

**Form Interaction:**
```typescript
cy.get("[data-cy=email]").type("user@example.com");
cy.get("[data-cy=password]").type("secret123");
cy.get("[data-cy=submit]").click();
cy.get("[data-cy=welcome]").should("contain", "user@example.com");
```

**Network Stubbing:**
```typescript
cy.intercept("GET", "/api/users", { fixture: "users.json" }).as("getUsers");
cy.visit("/users");
cy.wait("@getUsers");
cy.get("[data-cy=user-list]").children().should("have.length", 3);
```

**Component Mount (React):**
```typescript
import { mount } from "cypress/react18";
import { Button } from "./Button";

it("renders with label", () => {
  mount(<Button label="Click me" />);
  cy.get("button").should("contain", "Click me");
});
```

**Viewport Testing:**
```typescript
cy.viewport("iphone-x");
cy.get("[data-cy=mobile-menu]").should("be.visible");
cy.get("[data-cy=desktop-nav]").should("not.be.visible");
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `async/await` with Cypress commands | Cypress commands are enqueued, not Promises. Chain with `.then()` instead of `await` |
| Storing command results in variables | Use `.then()` or `.as()` aliases: `cy.get("el").as("myEl")` then `cy.get("@myEl")` |
| Using `cy.wait(5000)` for timing | Use `cy.intercept()` + `cy.wait("@alias")` or assertion retries instead of hard waits |
| Returning values from `.then()` | `.then()` yields to the next command, it does not return a value to outer scope |
| Using `Cypress.env()` in v15.10+ | `Cypress.env()` is deprecated; migrate to `cy.env()` and `Cypress.expose()` before v16 |
| Not using `data-cy` attributes | Avoid brittle selectors tied to CSS/structure; use `data-cy` or `data-testid` attributes |
| Mixing `cy.route()` with `cy.intercept()` | `cy.route()` was removed in Cypress 12. Use `cy.intercept()` for all network stubbing |

## Full Reference

See `reference.md` in this skill directory for complete documentation including command chaining, cy.intercept patterns, component testing setup, custom commands with TypeScript, cy.session auth caching, cy.origin cross-origin testing, Cypress Cloud, CI/CD integration, debugging, and all common errors with fixes.
