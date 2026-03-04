# P3 God Component Decomposition Plan

> **For Claude:** REQUIRED SUB-SKILL: Use armadillo:executing-plans to implement this plan task-by-task.

**Goal:** Break three god components (4,874 LOC total) into focused sub-components along their natural tab boundaries, without changing any behavior.

**Architecture:** Each god component already uses `<Tabs>` internally. Extract each tab's content into its own component file, passing data and callbacks as props. The parent component becomes a thin shell: state + data loading + tabs routing to sub-components. This is a pure refactor — no behavior changes, no new features.

**Tech Stack:** React 18, TypeScript, shadcn/ui Tabs

**Approach per component:**
1. Identify tab boundaries (already clear from grep analysis)
2. Extract each tab's JSX + its related handlers into a sub-component
3. Parent passes data down as props, callbacks for mutations
4. Verify build + existing tests pass after each extraction

**Note on TDD:** These are pure refactors — no new behavior is being added. The existing test suite (21 tests) validates no regressions. Each task verifies: build succeeds + tests pass. We are NOT writing new unit tests for extracted sub-components since they render identical JSX with identical behavior. Tests for these components would be added when new behavior is added to them (per YAGNI).

---

## Task 1: Decompose MarketingProfile — extract Overview tab

**Files:**
- Create: `src/pages/marketing-profile/OverviewTab.tsx`
- Modify: `src/pages/MarketingProfile.tsx`

MarketingProfile has 5 tabs: Overview, Business Model, Goals & Strategy, Competition, Brand Voice. The Overview tab (lines 849-1127) contains Company Details and Primary Contact cards — ~278 lines of JSX.

**Step 1: Create OverviewTab component**

Create `src/pages/marketing-profile/OverviewTab.tsx` that:
- Accepts props: `discoveryData`, `companyDetailsForm`, `setCompanyDetailsForm`, `editingCompanyDetails`, `setEditingCompanyDetails`, `savingCompanyDetails`, `handleSaveCompanyDetails`, `handleCancelCompanyDetailsEdit`, `primaryContactForm`, `setPrimaryContactForm`, `editingPrimaryContact`, `setEditingPrimaryContact`, `savingPrimaryContact`, `handleSavePrimaryContact`, `handleCancelPrimaryContactEdit`
- Contains the JSX currently between `<TabsContent value="overview">` and its closing tag
- Export as named export

**Step 2: Replace inline JSX in MarketingProfile with `<OverviewTab ... />`**

**Step 3: Verify**

Run: `npx vitest run && npx vite build 2>&1 | tail -3`
Expected: 21/21 pass, build succeeds

**Step 4: Commit**

```bash
git add src/pages/marketing-profile/OverviewTab.tsx src/pages/MarketingProfile.tsx
git commit -m "refactor(marketing-profile): extract OverviewTab component"
```

---

## Task 2: Decompose MarketingProfile — extract BusinessModelTab

**Files:**
- Create: `src/pages/marketing-profile/BusinessModelTab.tsx`
- Modify: `src/pages/MarketingProfile.tsx`

Business Model tab (lines 1130-1297) contains Core Services and Economics cards — ~167 lines.

**Step 1: Create BusinessModelTab component**

Props: `discoveryData`, `economicsForm`, `setEconomicsForm`, `editingEconomics`, `setEditingEconomics`, `savingEconomics`, `handleSaveEconomics`, `handleCancelEconomicsEdit`

**Step 2: Replace inline JSX**

**Step 3: Verify** — `npx vitest run && npx vite build 2>&1 | tail -3`

**Step 4: Commit**

```bash
git add src/pages/marketing-profile/BusinessModelTab.tsx src/pages/MarketingProfile.tsx
git commit -m "refactor(marketing-profile): extract BusinessModelTab component"
```

---

## Task 3: Decompose MarketingProfile — extract GoalsTab, CompetitionTab, BrandVoiceTab

**Files:**
- Create: `src/pages/marketing-profile/GoalsTab.tsx`
- Create: `src/pages/marketing-profile/CompetitionTab.tsx`
- Create: `src/pages/marketing-profile/BrandVoiceTab.tsx`
- Modify: `src/pages/MarketingProfile.tsx`

Extract the remaining 3 tabs:
- Goals & Strategy (lines 1300-1653): quarterly goals, annual target, current state — ~353 lines
- Competition (lines 1656-1722): competitor cards — ~66 lines
- Brand Voice (lines 1725-2064): voice & tone, brand story — ~339 lines

**Step 1: Create all three tab components** with appropriate props

GoalsTab props: `discoveryData`, `quarterlyGoals`, `goalsLoading`, `filterQuarter`, `setFilterQuarter`, `filterYear`, `setFilterYear`, `filterStatus`, `setFilterStatus`, `editingGoal`, `setEditingGoal`, `savingGoalId`, `handleGoalFieldChange`, `handleSaveGoal`, `handleDeleteGoal`, `handleAddGoalClick`, `currentStateForm`, `setCurrentStateForm`, `editingCurrentState`, `setEditingCurrentState`, `savingCurrentState`, `handleSaveCurrentState`, `handleCancelCurrentStateEdit`, `addGoalDialogOpen`, `setAddGoalDialogOpen`, `submissionId`, `onGoalAdded`

CompetitionTab props: `competitors`, `loadingCompetitors`, `competitorDialogOpen`, `setCompetitorDialogOpen`, `editingCompetitor`, `setEditingCompetitor`, `onCompetitorSaved`

BrandVoiceTab props: `discoveryData`, `brandVoiceForm`, `setBrandVoiceForm`, `editingBrandVoice`, `setEditingBrandVoice`, `savingBrandVoice`, `handleSaveBrandVoice`, `handleCancelBrandVoiceEdit`, `brandStoryForm`, `setBrandStoryForm`, `editingBrandStory`, `setEditingBrandStory`, `savingBrandStory`, `handleSaveBrandStory`, `handleCancelBrandStoryEdit`, `storyModalOpen`, `setStoryModalOpen`, `transcript`, `summary`

**Step 2: Replace inline JSX for all three tabs**

**Step 3: Verify** — `npx vitest run && npx vite build 2>&1 | tail -3`

**Step 4: Commit**

```bash
git add src/pages/marketing-profile/ src/pages/MarketingProfile.tsx
git commit -m "refactor(marketing-profile): extract GoalsTab, CompetitionTab, BrandVoiceTab"
```

---

## Task 4: Decompose TaskDrawer — extract DetailsTab

**Files:**
- Create: `src/components/tasks/task-drawer/DetailsTab.tsx`
- Modify: `src/components/tasks/TaskDrawer.tsx`

TaskDrawer has 3 tabs: Details, Comments, Related. Details tab (lines 809-1026) is the biggest — ~217 lines of form fields (title, description, status, priority, due date, color, assignees, watchers).

**Step 1: Create DetailsTab component**

Props: `editedTask`, `setEditedTask`, `taskColumns`, `users`, `selectedAssignees`, `setSelectedAssignees`, `selectedWatchers`, `setSelectedWatchers`, `subtasks`, `onSubtaskUpdate`, `isAdminOrFMM`, `task`

**Step 2: Replace inline JSX in TaskDrawer**

**Step 3: Verify** — `npx vitest run && npx vite build 2>&1 | tail -3`

**Step 4: Commit**

```bash
git add src/components/tasks/task-drawer/DetailsTab.tsx src/components/tasks/TaskDrawer.tsx
git commit -m "refactor(task-drawer): extract DetailsTab component"
```

---

## Task 5: Decompose TaskDrawer — extract CommentsTab and RelatedTab

**Files:**
- Create: `src/components/tasks/task-drawer/CommentsTab.tsx`
- Create: `src/components/tasks/task-drawer/RelatedTab.tsx`
- Modify: `src/components/tasks/TaskDrawer.tsx`

Comments tab (lines 1028-1062) is small (~34 lines). Related tab (lines 1064-1462) is large (~398 lines) — contains link dialogs for assets, meetings, channels, website pages.

**Step 1: Create CommentsTab component**

Props: `comments`, `newComment`, `setNewComment`, `handleAddComment`, `users`, `renderCommentText`

**Step 2: Create RelatedTab component**

Props: all the related items state + link/unlink handlers (relatedAssets, relatedMeetings, relatedChannels, linkedWebsitePage, showLink*Dialog, available*, handleLink*, handleUnlink*, navigate)

**Step 3: Replace inline JSX**

**Step 4: Verify** — `npx vitest run && npx vite build 2>&1 | tail -3`

**Step 5: Commit**

```bash
git add src/components/tasks/task-drawer/ src/components/tasks/TaskDrawer.tsx
git commit -m "refactor(task-drawer): extract CommentsTab and RelatedTab components"
```

---

## Task 6: Decompose PostManagementDrawer — extract ContentTab

**Files:**
- Create: `src/components/social/post-drawer/ContentTab.tsx`
- Modify: `src/components/social/PostManagementDrawer.tsx`

PostManagementDrawer has 4 tabs: Content, Analytics, Comments, Channels. Content tab (lines 735-1073) is the biggest — ~338 lines with caption editor, topic ideas, image generation, scheduling.

**Step 1: Create ContentTab component**

Props: caption/topic/image state + all the generate/save handlers

**Step 2: Replace inline JSX**

**Step 3: Verify** — `npx vitest run && npx vite build 2>&1 | tail -3`

**Step 4: Commit**

```bash
git add src/components/social/post-drawer/ContentTab.tsx src/components/social/PostManagementDrawer.tsx
git commit -m "refactor(post-drawer): extract ContentTab component"
```

---

## Task 7: Decompose PostManagementDrawer — extract AnalyticsTab, CommentsTab, ChannelsTab

**Files:**
- Create: `src/components/social/post-drawer/AnalyticsTab.tsx`
- Create: `src/components/social/post-drawer/CommentsTab.tsx`
- Create: `src/components/social/post-drawer/ChannelsTab.tsx`
- Modify: `src/components/social/PostManagementDrawer.tsx`

Extract remaining 3 tabs:
- Analytics (lines 1076-1144): ~68 lines
- Comments (lines 1147-1185): ~38 lines
- Channels (lines 1188-1260): ~72 lines

**Step 1: Create all three tab components**

**Step 2: Replace inline JSX**

**Step 3: Verify** — `npx vitest run && npx vite build 2>&1 | tail -3`

**Step 4: Commit**

```bash
git add src/components/social/post-drawer/ src/components/social/PostManagementDrawer.tsx
git commit -m "refactor(post-drawer): extract AnalyticsTab, CommentsTab, ChannelsTab"
```

---

## Task 8: Final verification

**Files:** None (verification only)

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: 21/21 pass

**Step 2: Run production build**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Verify line counts dropped**

Run: `wc -l src/pages/MarketingProfile.tsx src/components/tasks/TaskDrawer.tsx src/components/social/PostManagementDrawer.tsx`
Expected: Each file significantly smaller — parent shells should be ~200-400 LOC instead of 1,200-2,000+

---

## Summary

| Task | Component | Extractions | Lines Moved |
|------|-----------|-------------|-------------|
| 1 | MarketingProfile | OverviewTab | ~278 |
| 2 | MarketingProfile | BusinessModelTab | ~167 |
| 3 | MarketingProfile | GoalsTab, CompetitionTab, BrandVoiceTab | ~758 |
| 4 | TaskDrawer | DetailsTab | ~217 |
| 5 | TaskDrawer | CommentsTab, RelatedTab | ~432 |
| 6 | PostManagementDrawer | ContentTab | ~338 |
| 7 | PostManagementDrawer | AnalyticsTab, CommentsTab, ChannelsTab | ~178 |
| 8 | Verification | — | — |

**Expected outcome:** 13 focused sub-components extracted. Parent files drop from 2,086 / 1,486 / 1,302 LOC to ~300-500 LOC each. Zero behavior change. Easier to navigate, test, and modify individual sections.

**Parallelization:** Tasks 1-3 (MarketingProfile), 4-5 (TaskDrawer), and 6-7 (PostManagementDrawer) touch completely different files. Within each group tasks are sequential, but groups can run in parallel.
