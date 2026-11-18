---
name: qa-review
description: >-
  Runs a comprehensive UI/UX/A11y/Responsive QA review for the Car Manager application.
  Orchestrates review subagents (UI, UX, Accessibility, Responsive), tests the implemented
  solution in the browser, and compiles a unified report at docs/qa/YYYY-MM-DD-qa-report.md.
  Use when the user requests /qa-review, a QA audit, or post-implementation UI/UX review.
tools:
  - browser
---

# QA Review Skill

Orchestrates a full UI, UX, Accessibility, and Responsive QA review of the Car Manager application, including live browser verification of the implemented changes.

## Overview

1. **Live Browser Verification**: Test the implemented changes in a running browser instance to verify appearance, layout, and user interactions.
2. **Review across 4 specialized dimensions**:
   - **UI Review**: Visual consistency, Ionic component usage, spacing, colors, BEM styles.
   - **UX Analysis**: Navigation flows, empty states, error handling, heuristic usability.
   - **Accessibility Audit (A11y)**: WCAG 2.1 AA compliance, labels, ARIA, touch targets, keyboard navigation.
   - **Responsive Check**: Mobile-first layout (viewport <= 430px), tablet adjustments, overflow prevention.
3. **Collect findings and generate a unified report** in `docs/qa/YYYY-MM-DD-qa-report.md`.
4. **Present a summary** with severity breakdown (Critical, High, Medium, Low) and concrete action items.

## Step-by-Step Workflow

### 1. Preparation & Static Checks

- Run static checks first:
  ```bash
  npm run static:checks
  ```
- Run automated accessibility tests:
  ```bash
  npm exec nx run car-manager-e2e:a11y
  ```

### 2. Live Browser Testing (Mandatory)

**Always test the implemented solution in a live browser:**

1. Ensure the development server is running (`npm exec nx serve car-manager` or background dev server on `http://localhost:4200`).
2. Use the **browser tool** (or Playwright / Chrome DevTools MCP) to navigate to the target views.
3. Test the application interactively in the browser:
   - **Mobile viewport verification**: Set the viewport to mobile size (width <= 430px, e.g. 390x844 iPhone 14) and verify that elements do not overflow or misalign.
   - **Visual inspection**: Check typography, margins, ionic variables, dark/light theme consistency, and BEM styling.
   - **Interaction testing**: Click buttons, fill inputs, test validations, open modals, switch tabs, test route transitions.
   - **State verification**: Verify all visual states in the browser — loading skeletons/spinners, empty states, success messages, and error banners.
4. Take screenshots or capture visual evidence for the QA report.

### 3. Review Dimensions

Evaluate recent changes or target pages against:

- `.agents/skills/anti-ui-slop/SKILL.md` for Ionic UI rules.
- Mobile viewport constraints (<= 430px).
- Polish language localization consistency (`pl-PL`).

### 4. Generate Report

Write results to `docs/qa/<YYYY-MM-DD>-qa-report.md` including:

- Summary table with issue counts by severity.
- Browser testing observations (tested viewports, routes, interactions).
- Detailed findings per dimension with file references and suggested fixes.
- Next steps recommendations.
