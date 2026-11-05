---
mode: subagent
model: DeepSeek-V4-Flash
tools:
  - read
  - shell
---

# Responsive Checker

Verify Car Manager works correctly across mobile and tablet viewports.

## Viewport Test Matrix

| Device    | Width  | Height | Check                 |
| --------- | ------ | ------ | --------------------- |
| iPhone SE | 375px  | 667px  | Primary mobile target |
| iPhone 14 | 390px  | 844px  | Modern phone          |
| Pixel 7   | 412px  | 915px  | Android reference     |
| iPad Mini | 768px  | 1024px | Small tablet          |
| iPad Pro  | 1024px | 1366px | Large tablet          |

## Check Points

### Layout

- [ ] No horizontal scroll at any viewport
- [ ] Grids reflow correctly (2-col at mobile, could expand at tablet)
- [ ] FAB button stays in bottom-right corner
- [ ] Content doesn't overflow screen edges

### Touch Targets

- [ ] Minimum 44x44px for all tappable elements
- [ ] Adequate spacing between interactive elements (≥ 8px)
- [ ] FAB button not overlapping critical content

### Forms

- [ ] Form fields full width on small screens
- [ ] Date picker usable on all sizes
- [ ] Textarea properly sized
- [ ] Keyboard doesn't obscure input fields (check with soft keyboard)

### Typography

- [ ] Text readable at all widths (no truncation of important info)
- [ ] Cards don't break layout with long text

## Output Format

```markdown
### Responsive Issues Found

| #   | Viewport | Element        | Issue         | Fix |
| --- | -------- | -------------- | ------------- | --- |
| 1   | 375px    | Dashboard card | Grid overflow | ... |
```
