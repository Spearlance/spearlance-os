# Cypress Developer Reference

> **Last Updated:** February 2026
> **Current Version:** 15.10.0
> **Bundled Node.js:** 22.15.1
> **Bundled Chromium:** 136.0.7103.149
> **Documentation:** https://docs.cypress.io

---

## Table of Contents

1. [Installation and Configuration](#1-installation-and-configuration)
2. [Test Structure and Hooks](#2-test-structure-and-hooks)
3. [Commands and Chaining](#3-commands-and-chaining)
4. [Selectors and Querying](#4-selectors-and-querying)
5. [Assertions](#5-assertions)
6. [Network Interception (cy.intercept)](#6-network-interception-cyintercept)
7. [Component Testing](#7-component-testing)
8. [Custom Commands](#8-custom-commands)
9. [Fixtures and Test Data](#9-fixtures-and-test-data)
10. [Viewport and Responsive Testing](#10-viewport-and-responsive-testing)
11. [File Uploads and Downloads](#11-file-uploads-and-downloads)
12. [Authentication Patterns](#12-authentication-patterns)
13. [Parallel Execution and Cypress Cloud](#13-parallel-execution-and-cypress-cloud)
14. [CI/CD Integration](#14-cicd-integration)
15. [Debugging (Time Travel, Screenshots)](#15-debugging-time-travel-screenshots)
16. [Common Errors and Fixes](#16-common-errors-and-fixes)
17. [Recent Changes and Deprecations](#17-recent-changes-and-deprecations)

---

## 1. Installation and Configuration

```bash
npm install -D cypress
npx cypress open   # Opens interactive runner and scaffolds project structure
```

First run creates: `cypress/` directory, `cypress.config.ts`, `cypress/support/`, `cypress/fixtures/`.

### cypress.config.ts

```typescript
import { defineConfig } from "cypress";

export default defineConfig({
  // Global
  defaultCommandTimeout: 4000,
  pageLoadTimeout: 60000,
  requestTimeout: 5000,
  responseTimeout: 30000,
  video: true,
  screenshotOnRunFailure: true,
  retries: { runMode: 0, openMode: 0 },
  numTestsKeptInMemory: 50,
  experimentalFastVisibility: false, // v15: faster visibility checks

  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    setupNodeEvents(on, config) {
      return config;
    },
  },

  component: {
    specPattern: "src/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/component.ts",
    devServer: {
      framework: "react",  // "react" | "vue" | "angular" | "next" | "nuxt" | "svelte"
      bundler: "vite",      // "vite" | "webpack"
    },
  },
});
```

### Environment Variables

As of v15.10.0, `Cypress.env()` is deprecated (removal in v16). New APIs:

```typescript
// OLD (deprecated)
const apiUrl = Cypress.env("API_URL");

// NEW
cy.env("API_URL").then((url) => { cy.request(url + "/health"); });
// Cypress.expose() for non-sensitive public config
```

Legacy sources (still functional in v15): `cypress.env.json`, `CYPRESS_*` env vars, `--env` CLI flag, `env` in config.

---

## 2. Test Structure and Hooks

```typescript
describe("Feature", () => {
  before(() => { cy.task("db:seed"); });       // Once before all
  beforeEach(() => { cy.visit("/"); });         // Before each test
  afterEach(() => { /* cleanup */ });           // After each test
  after(() => { /* teardown */ });              // Once after all

  it("does something", () => {
    cy.get("[data-cy=title]").should("contain", "Hello");
  });

  context("nested group", () => {              // context() aliases describe()
    it("tests within group", () => { /* ... */ });
  });
});
```

Focus/skip: `describe.only()`, `it.only()`, `describe.skip()`, `it.skip()`.

### Test Retries

```typescript
// Global in config
retries: { runMode: 2, openMode: 0 }

// Per-test override
it("flaky test", { retries: { runMode: 3 } }, () => { /* ... */ });
```

---

## 3. Commands and Chaining

Cypress commands are **enqueued, not executed immediately**. You cannot use `async/await`.

```typescript
// WRONG
const el = await cy.get("[data-cy=title]");

// CORRECT
cy.get("[data-cy=title]").should("contain", "Hello");
```

### Command Categories

| Category | Behavior | Examples |
|----------|----------|---------|
| **Parent** | Start new chain | `cy.visit()`, `cy.get()`, `cy.request()`, `cy.intercept()` |
| **Child** | Operate on previous subject | `.click()`, `.type()`, `.find()`, `.should()`, `.then()` |
| **Dual** | Either parent or child | `cy.contains()`, `cy.screenshot()` |

### Key Chaining Commands

```typescript
// .then() - access yielded value
cy.get("[data-cy=count]").invoke("text").then((text) => {
  expect(parseInt(text, 10)).to.be.greaterThan(0);
});

// .its() - access a property
cy.wrap({ name: "Alice" }).its("name").should("eq", "Alice");

// .invoke() - call a method
cy.get("[data-cy=input]").invoke("val").should("eq", "default");

// .as() - create an alias
cy.get("[data-cy=user-row]").first().as("firstUser");
cy.get("@firstUser").should("contain", "Alice");
```

### Retry-ability

Query commands retry until assertions pass or timeout. Action commands do not retry.

| Retries | Does NOT Retry |
|---------|----------------|
| `cy.get()`, `.find()`, `.contains()` | `.click()`, `.type()`, `.clear()` |
| `.first()`, `.last()`, `.eq()` | `.select()`, `.check()`, `.uncheck()` |
| `.should()` (retries entire chain above) | `cy.request()` |

---

## 4. Selectors and Querying

Use `data-cy` attributes for stability: `<button data-cy="submit">` -> `cy.get("[data-cy=submit]")`.

```typescript
cy.get("selector");                        // CSS selector
cy.get("[data-cy=item]").first();          // First match
cy.get("[data-cy=item]").eq(2);            // By index
cy.contains("button", "Submit");           // Text match scoped to tag
cy.get("[data-cy=parent]").find("li");     // Descendant search
cy.get("[data-cy=child]").closest("div");  // Ancestor traversal
cy.get("[data-cy=item]").filter(".active");// Filter matches
```

### Scoping with .within()

```typescript
cy.get("[data-cy=login-form]").within(() => {
  cy.get("[data-cy=email]").type("user@example.com");
  cy.get("[data-cy=submit]").click();
});
```

---

## 5. Assertions

### Implicit (.should)

```typescript
cy.get("[data-cy=header]").should("exist");
cy.get("[data-cy=header]").should("be.visible");
cy.get("[data-cy=title]").should("contain", "Welcome");
cy.get("[data-cy=title]").should("have.text", "Welcome Home");
cy.get("[data-cy=btn]").should("have.class", "active");
cy.get("[data-cy=btn]").should("have.attr", "disabled");
cy.get("[data-cy=link]").should("have.attr", "href", "/about");
cy.get("[data-cy=input]").should("have.value", "hello");
cy.get("[data-cy=item]").should("have.length", 5);

// Chained
cy.get("[data-cy=status]")
  .should("be.visible")
  .and("contain", "Active")
  .and("have.class", "badge-success");
```

### Explicit (expect) and Callback

```typescript
cy.get("[data-cy=price]").should(($el) => {
  const price = parseFloat($el.text().replace("$", ""));
  expect(price).to.be.within(10, 100);
});
```

---

## 6. Network Interception (cy.intercept)

The sole API for network stubbing/spying. `cy.route()` was removed in Cypress 12.

```typescript
// Spy (no stub)
cy.intercept("GET", "/api/users").as("getUsers");
cy.visit("/users");
cy.wait("@getUsers").its("response.statusCode").should("eq", 200);

// Stub with static response
cy.intercept("GET", "/api/users", {
  statusCode: 200,
  body: [{ id: 1, name: "Alice" }],
}).as("getUsers");

// Stub with fixture
cy.intercept("GET", "/api/users", { fixture: "users.json" }).as("getUsers");

// Stub error
cy.intercept("POST", "/api/orders", { statusCode: 500, body: { error: "fail" } });

// Delayed response
cy.intercept("GET", "/api/data", { body: {}, delay: 2000 }).as("slow");
```

### Route Matching

```typescript
cy.intercept("GET", "/api/users?page=*");      // Glob
cy.intercept("GET", /\/api\/users\/\d+/);       // Regex
cy.intercept({ method: "POST", url: "/api/orders", query: { status: "pending" } });
```

### Dynamic Response

```typescript
cy.intercept("GET", "/api/users", (req) => {
  req.reply((res) => {
    res.body.push({ id: 99, name: "Injected" });
    res.send();
  });
});

// Modify request before sending to server
cy.intercept("POST", "/api/users", (req) => {
  req.headers["Authorization"] = "Bearer test-token";
  req.continue();
});
```

### Wait on Multiple

```typescript
cy.intercept("GET", "/api/users").as("getUsers");
cy.intercept("GET", "/api/settings").as("getSettings");
cy.visit("/dashboard");
cy.wait(["@getUsers", "@getSettings"]);
```

---

## 7. Component Testing

Component testing reached GA in Cypress 11 and is production-stable in v15.

### React (Vite)

```typescript
// cypress.config.ts
component: { devServer: { framework: "react", bundler: "vite" } }

// cypress/support/component.ts
import { mount } from "cypress/react18";
declare global { namespace Cypress { interface Chainable { mount: typeof mount; } } }
Cypress.Commands.add("mount", mount);
```

### Vue

```typescript
component: { devServer: { framework: "vue", bundler: "vite" } }
// cypress/support/component.ts -> import { mount } from "cypress/vue";
```

### Angular

```typescript
component: { devServer: { framework: "angular", bundler: "webpack" } }
```

Angular 21 supported in v15. Zoneless mount via `angular-zoneless`. Angular 17 dropped.

### Writing Component Tests

```typescript
import { Button } from "./Button";

describe("Button", () => {
  it("renders with label", () => {
    cy.mount(<Button label="Click me" />);
    cy.get("button").should("have.text", "Click me");
  });

  it("fires onClick handler", () => {
    const onClickSpy = cy.spy().as("onClick");
    cy.mount(<Button label="Submit" onClick={onClickSpy} />);
    cy.get("button").click();
    cy.get("@onClick").should("have.been.calledOnce");
  });
});
```

---

## 8. Custom Commands

```typescript
// cypress/support/commands.ts
Cypress.Commands.add("login", (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit("/login");
    cy.get("[data-cy=email]").type(email);
    cy.get("[data-cy=password]").type(password);
    cy.get("[data-cy=submit]").click();
    cy.url().should("not.include", "/login");
  });
});

Cypress.Commands.add("getByDataCy", (selector: string) => {
  return cy.get(`[data-cy=${selector}]`);
});
```

### TypeScript Types

```typescript
// cypress.d.ts
declare namespace Cypress {
  interface Chainable {
    login(email: string, password: string): Chainable<void>;
    getByDataCy(selector: string): Chainable<JQuery<HTMLElement>>;
  }
}
```

### Child and Dual Commands

```typescript
// Child (requires previous subject)
Cypress.Commands.add("drag", { prevSubject: "element" },
  (subject, targetSelector: string) => {
    cy.wrap(subject).trigger("dragstart");
    cy.get(targetSelector).trigger("drop");
  }
);

// Dual (optional subject)
Cypress.Commands.add("highlight", { prevSubject: "optional" },
  (subject) => {
    const target = subject ? cy.wrap(subject) : cy.get("body");
    target.invoke("css", "background-color", "yellow");
  }
);
```

---

## 9. Fixtures and Test Data

```typescript
// Load fixture
cy.fixture("users.json").then((users) => { expect(users).to.have.length(3); });

// With intercept
cy.intercept("GET", "/api/users", { fixture: "users.json" });

// Alias
cy.fixture("users.json").as("usersData");
```

### cy.task() for Node.js Code

```typescript
// cypress.config.ts
setupNodeEvents(on, config) {
  on("task", {
    "db:seed"() { return require("./scripts/seed").run(); },
    log(message: string) { console.log(message); return null; },
  });
}

// In test
cy.task("db:seed");
cy.task("log", "Test started");
```

---

## 10. Viewport and Responsive Testing

```typescript
cy.viewport("macbook-15");     // 1440x900
cy.viewport("ipad-2");         // 768x1024
cy.viewport("iphone-x");       // 375x812
cy.viewport(1920, 1080);       // Custom
cy.viewport("ipad-2", "landscape"); // Orientation
```

### Responsive Test Pattern

```typescript
const viewports = [
  { device: "mobile", width: 375, height: 812 },
  { device: "tablet", width: 768, height: 1024 },
  { device: "desktop", width: 1440, height: 900 },
] as const;

viewports.forEach(({ device, width, height }) => {
  describe(`${device}`, () => {
    beforeEach(() => { cy.viewport(width, height); cy.visit("/"); });
    it("displays nav correctly", () => {
      if (width < 768) {
        cy.get("[data-cy=mobile-menu]").should("be.visible");
      } else {
        cy.get("[data-cy=desktop-nav]").should("be.visible");
      }
    });
  });
});
```

---

## 11. File Uploads and Downloads

```typescript
// Upload
cy.get("[data-cy=file-input]").selectFile("cypress/fixtures/document.pdf");
cy.get("[data-cy=file-input]").selectFile(["fixtures/a.jpg", "fixtures/b.jpg"]);
cy.get("[data-cy=dropzone]").selectFile("fixtures/file.csv", { action: "drag-drop" });
cy.get("[data-cy=file-input]").selectFile({
  contents: Cypress.Buffer.from("content"),
  fileName: "test.txt",
  mimeType: "text/plain",
});

// Download verification
cy.get("[data-cy=download-btn]").click();
cy.readFile("cypress/downloads/report.csv").should("contain", "header1");
```

---

## 12. Authentication Patterns

### cy.session() (Cached Auth)

Caches cookies, localStorage, sessionStorage across tests. GA since Cypress 12.

```typescript
Cypress.Commands.add("login", (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit("/login");
    cy.get("[data-cy=email]").type(email);
    cy.get("[data-cy=password]").type(password);
    cy.get("[data-cy=submit]").click();
    cy.url().should("not.include", "/login");
  }, {
    validate() { cy.request("/api/me").its("status").should("eq", 200); },
  });
});
```

### API-Based Login (Faster)

```typescript
Cypress.Commands.add("loginByApi", (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.request("POST", "/api/auth/login", { email, password }).then((res) => {
      window.localStorage.setItem("token", res.body.token);
    });
  });
});
```

### cy.origin() (Cross-Origin)

Required in Cypress 14+ for cross-origin navigation within a single test.

```typescript
it("logs in via OAuth", () => {
  cy.visit("/login");
  cy.get("[data-cy=oauth-login]").click();
  cy.origin("https://auth.provider.com", { args: { email, password } }, ({ email, password }) => {
    cy.get("#username").type(email);
    cy.get("#password").type(password);
    cy.get("#login-btn").click();
  });
  cy.url().should("include", "/dashboard");
});
```

---

## 13. Parallel Execution and Cypress Cloud

Cypress Cloud provides recording, parallelization, flake detection, and analytics.

| Plan | Price (as of Feb 2026) | Test Results/Month |
|------|------------------------|--------------------|
| Starter | Free | 500 |
| Team | ~$67/mo | Included allotment |
| Business | ~$267/mo | Higher allotment |
| Enterprise | Custom | Unlimited |

Overage: $6 per 1,000 additional test results.

```bash
npx cypress run --record --key YOUR_KEY
npx cypress run --record --key YOUR_KEY --parallel          # Distributed across CI machines
npx cypress run --record --key YOUR_KEY --tag "staging"     # Tagged runs
npx cypress run --record --key YOUR_KEY --group "chrome"    # Grouped runs
```

Cloud handles spec distribution automatically via spec-duration-based load balancing.

---

## 14. CI/CD Integration

### GitHub Actions

```yaml
name: Cypress Tests
on: [push, pull_request]
jobs:
  cypress:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        containers: [1, 2, 3]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - uses: cypress-io/github-action@v6
        with: { record: true, parallel: true, group: "e2e" }
        env:
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
```

### Docker

```bash
docker pull cypress/included:15.10.0
docker run -v $(pwd):/e2e -w /e2e cypress/included:15.10.0
```

---

## 15. Debugging (Time Travel, Screenshots)

**Time-Travel:** The runner captures a DOM snapshot at every command. Click any command in the Command Log to inspect DOM state at that moment (available in `cypress open` only).

**Selector Playground:** Available for all users in v15 open mode. Auto-enables interactive mode for building selectors.

```typescript
cy.screenshot("homepage-loaded");                    // Manual screenshot
cy.get("[data-cy=chart]").screenshot("chart");       // Element screenshot
cy.log("About to submit");                           // Command Log entry
cy.get("[data-cy=form]").debug();                    // Open DevTools debugger
cy.pause();                                          // Pause execution
```

Screenshots saved to `cypress/screenshots/`, videos to `cypress/videos/`.

---

## 16. Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Timed out retrying: Expected to find element` | Element not rendered | Increase `defaultCommandTimeout`; verify selector; check conditional rendering |
| `cy.click() failed...covered by another element` | Overlay/z-index issue | Use `{ force: true }` or close overlay first |
| `cy.type() can only be called on a single element` | Multiple matches | Make selector specific or use `.first()` |
| `cy...is not a function` | Missing custom command | Verify name; ensure `commands.ts` imported in support file |
| `cross-origin error` | Different origin without `cy.origin()` | Wrap in `cy.origin("https://other.com", () => { ... })` |
| `returned a promise...also invoked commands` | Mixed promises + cy commands | Use `.then()` chaining, not Promise returns |
| `cy.wait() timed out waiting for request` | Intercept registered too late | Register `cy.intercept()` **before** the triggering action |
| `Cannot call cy.xyz() outside a running test` | Command in failed hook | Move to `beforeEach()`/`afterEach()` or fix failing test |
| `Subject is: undefined` | `.then()` did not yield element | Return element from `.then()` or use query command |
| `Blocked a frame with origin` | Cross-origin iframe | Use `cy.origin()` or `chromeWebSecurity: false` |
| `ESOCKETTIMEDOUT` / `ECONNREFUSED` | Server not running | Verify `baseUrl`; start dev server before Cypress |
| `Node.js heap out of memory` | Too many tests in memory | Reduce `numTestsKeptInMemory` |

---

## 17. Recent Changes and Deprecations

### Cypress 15 Breaking Changes (2025)

| Change | Details |
|--------|---------|
| **Node.js 18/23 dropped** | Requires Node.js 20, 22, or 24+ |
| **`cy.exec()` code -> exitCode** | Renamed property on exec result |
| **Linux glibc >= 2.31** | Prebuilt binaries require glibc 2.31+ |
| **`cy.stub()` 3-arg removed** | Deprecated signature removed |
| **webpack 4 dropped** | `cypress/webpack-preprocessor` requires webpack 5+ |
| **Angular 17 dropped** | Minimum Angular 18+; zone.js >= 0.14.0 |

### Cypress 15.10.0 Deprecations (February 2026)

| Deprecation | Migration |
|-------------|-----------|
| **`Cypress.env()` deprecated** | Removal in v16. Use `cy.env()` for test access, `Cypress.expose()` for public config. Motivated by security: `Cypress.env()` hydrates all values into browser context. |
| **`injectDocumentDomain` deprecated** | Use `cy.origin()` for cross-origin testing instead. |

### Cypress 15 New Features

| Feature | Details |
|---------|---------|
| **`experimentalFastVisibility`** | Faster visibility checks and assertions |
| **Angular 21 + zoneless** | Component testing with `angular-zoneless` mount |
| **Selector Playground** | Available for all users in open mode |
| **`experimentalRunAllSpecs` for components** | Run all component specs in single run |
| **Bundled Node.js 22.15.1** | Up from 20.18.1 |
| **Bundled Chromium 136** | Up from 130 |

### Cypress 14 Breaking Changes (Reference)

| Change | Details |
|--------|---------|
| **`cy.origin()` required** | Must use for cross-origin navigation in same test |
| **`document.domain` injection removed** | No longer injected by default |

### Migration Path

1. **v13 -> v14:** Add `cy.origin()` for cross-origin navigation. Remove `document.domain` reliance.
2. **v14 -> v15:** Upgrade Node.js to 20+. Rename `code` to `exitCode` on `cy.exec()`. Angular 18+ required. Webpack 5+ required.
3. **v15.10+ -> v16:** Migrate `Cypress.env()` to `cy.env()` / `Cypress.expose()`.
