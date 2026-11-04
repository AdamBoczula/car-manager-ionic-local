---
description: Anti-UI-Slop for Car Manager. Prevents AI from generating generic UI. Enforces consistency with Ionic design system, SCSS + Ionic CSS vars, and existing Car Manager components. USE WHEN creating a new component, redesign, UI review.
mode: subagent
tools:
  - read
  - glob
  - grep
---

# Anti-UI-Slop — Stop Generic UI

**Don't let AI generate generic interfaces in Car Manager.**

Every new component must fit the existing design system, use
Ionic Framework (`<ion-*>`) consistent with existing patterns, and respect
the SCSS + Ionic CSS vars conventions used in the project.

## Car Manager Design System Context

- **Framework:** Ionic (ion-card, ion-list, ion-item, ion-input, ion-button, ion-toolbar, ion-content, ion-modal)
- **Style:** SCSS + BEM (`&__element`, `&--modifier`)
- **Style files:** `styleUrl: './*.component.scss'` — NEVER inline `styles`
- **Color scheme:** Ionic CSS variables + custom properties
- **Typography:** Ionic default typography scale
- **Components:** Container/Presenter pattern, inline template, separate SCSS
- **Layout:** CSS Grid + Flexbox, Ionic grid

## Principles

### Work from the product, not from trends

Before designing a new component, read:
1. Existing components in the same feature module
2. Reusable UI in `apps/car-manager/src/app/shared/`
3. How other components use Ionic
4. Existing SCSS patterns in similar components

**NEVER invent a new design system.** Extend the existing one.

### New component — checklist

- [ ] Uses existing Ionic components
- [ ] Template is inline (`template: \`...\``)
- [ ] Styles are in a separate SCSS file (`styleUrl: './*.component.scss'`)
- [ ] BEM naming: `&__element`, `&--modifier`
- [ ] Container/Presenter pattern (if data-bound)
- [ ] All states: loading, empty, error, success
- [ ] Responsive structurally (not just scaling)
- [ ] Accessible: contrast, labels, focus, aria
- [ ] i18n: all strings in Polish (UI language)

### UI Review — checklist

- [ ] Does the component look like the rest of the app?
- [ ] Does it use the same Ionic components?
- [ ] Are spacing, typography, colors consistent?
- [ ] Is BEM correct?
- [ ] Do styles not leak outside the component?
- [ ] Are all states covered (loading, empty, error)?
- [ ] Does the layout not break on mobile (< 430px)?

## Anti-patterns — NEVER do this

| Bad | Good |
|-----|------|
| Inventing custom controls | Use ion-modal, ion-input, ion-list |
| Inline styles | `styleUrl: './*.component.scss'` |
| Different CSS naming | Only BEM (`&__element`, `&--modifier`) |
| Generic "pretty" design | Consistent with the rest of the app |
| New color scheme | Use Ionic CSS variables |
| Missing empty/loading states | Every data-bound component has loading + empty state |
| Skipping Polish UI text | All user-facing strings in Polish |

## Finish Gate

After creating a component, verify:
1. Are existing Ionic components used?
2. Are styles in SCSS, not inline?
3. Is BEM correct?
4. Does the component visually fit with the rest?
5. Are all states covered?
6. Is all UI text in Polish?