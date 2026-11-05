# Navigation & Redirect Rules – Car Manager

> **Read before touching any NavController, Router, or ion-back-button code.**

---

## 1. Always wrap NavController in `zone.run()`

```typescript
// ✅ CORRECT
this.zone.run(() => this.navController.navigateForward(path));

// ❌ WRONG — breaks change detection after navigation
this.navController.navigateForward(path);
```

**Why:** Ionic NavController resolves outside Angular's zone. Without `zone.run()`,
Angular change detection won't fire after navigation, causing frozen UI, missing
data updates, and broken Ionic transitions.

**Applies to:** `navigateForward`, `navigateBack`, `navigateRoot` — ALL three.

**Enforcement:** Every page/component that calls NavController MUST inject `NgZone`
and wrap every call.

---

## 2. Use `navigateForward` (not `navigateBack`) for post-submit redirects

```typescript
// ✅ CORRECT — goes to dashboard after adding refuel/repair
this.zone.run(() => this.navController.navigateForward('/dashboard'));

// ❌ WRONG — navigateBack assumes target is in the nav stack;
//           if it's not, Ionic falls back to setRoot() which DESTROYS
//           the current page and all pages below it, breaking services
this.zone.run(() => this.navController.navigateBack('/refuel-list'));
```

**Why:** `navigateBack(url)` looks for `url` in the Ionic navigation stack.
When the url is NOT in the stack (e.g., user came from dashboard to refuel-form,
not from refuel-list), Ionic executes `setRoot()` — destroying ALL pages in the
stack and pushing the target as the sole entry. This triggers `ngOnDestroy` on
pages still in memory, which can stop service listeners, creating race conditions
with the next page's `startListening()` calls.

**Rule:** If you are navigating TO a page (not going back in history), ALWAYS
use `navigateForward`.

---

## 3. NEVER call `stopListening()` in `ngOnDestroy` on a hub/navigation page

```typescript
// ✅ CORRECT — dashboard is a hub, let the next page handle listeners
ngOnDestroy(): void {
  // DO NOT call stopListening() here. The next page's startListening()
  // calls stopListening() internally. Calling it here creates a race
  // condition where the next page's async data load fails the generation
  // check (isCurrentListener returns false) → data never loads.
}

// ❌ WRONG — causes data to never appear on subsequent pages
ngOnDestroy(): void {
  this.refuelService.stopListening();  // BUG!
}
```

**Why:** When navigating from dashboard → form → submit, the form's `navigateForward`
may cause the dashboard to be destroyed (depending on Ionic stack behavior).
If `stopListening()` is called during `ngOnDestroy`, it increments the service's
`listenerGeneration` counter. The next page's `startListening()` begins an async
storage read, but the generation no longer matches → `isCurrentListener()` returns
false → the signal stays empty forever.

**Rule:** Hub/navigation pages (dashboard) should NOT stop service listeners on
destroy. Only leaf pages (refuel-list, repair-list) that hold exclusive ownership
of the listener should stop it. The `startListening()` method of each service
internally calls `stopListening()` before starting, so cleanup is automatic.

---

## 4. `ion-back-button defaultHref` – match the route hierarchy

```html
<!-- ✅ CORRECT: consistent hierarchy -->
<!-- refuel-form → falls back to list if no history -->
<ion-back-button defaultHref="/refuel-list" />

<!-- refuel-list → falls back to dashboard -->
<ion-back-button defaultHref="/dashboard" />

<!-- ❌ WRONG: skips a level, confusing navigation -->
<ion-back-button defaultHref="/dashboard" />  <!-- on refuel-form -->
```

**Hierarchy:** `dashboard → list → form`

`defaultHref` is only used when there's nothing in the navigation stack to pop
back to (e.g., user navigated directly to the URL). Keep it one level up in the
hierarchy.

---

## 5. Post-submit navigation target — go to where the data is visible

```typescript
// ✅ CORRECT: after adding refuel/repair, go to dashboard
//           (dashboard now shows recent refuels/repairs)
this.zone.run(() => this.navController.navigateForward('/dashboard'));

// ❌ OBSOLETE: old pattern went to list page, forcing user to tap back
this.zone.run(() => this.navController.navigateBack('/refuel-list'));
```

**Why:** Since the dashboard now shows recent entries (last 5 refuels and repairs),
returning there after form submit gives the user immediate confirmation that their
entry was saved.

---

## 6. CarSwitcher `carSelected` handler — reload page, don't leak form state

```typescript
// ✅ CORRECT on list/dashboard pages:
async handleCarSelected(id: string): Promise<void> {
  await this.carService.setActiveCar(id);
  await this.zone.run(() =>
    this.navController.navigateRoot('/dashboard', { animated: false })
  );
}

// ⚠️ ACCEPTABLE on form pages (avoids data loss — form fields persist):
handleCarSelected = (id: string) => this.carService.setActiveCar(id);
```

**Why on lists/dashboard:** `navigateRoot` recreates the page, which restarts
service listeners with the new car's data. Using `{ animated: false }` prevents
a jarring transition.

**Why on forms:** Reloading would wipe the user's partially-filled form. The form
pages silently switch the active car context without navigation. This is a
deliberate tradeoff: data preservation > context clarity.

---

## 7. Route guard composition

| Route | Guards | Why |
|-------|--------|-----|
| `dashboard`, `refuel-list`, `repair-list`, `refuel-form`, `repair-form` | `authGuard` + `carGuard` | Must be logged in AND have at least one car |
| `add-car` | `authGuard` only | `carGuard` redirects to `/add-car` when empty — putting it here would cause infinite loop |
| `login`, `register` | `noAuthGuard` | Blocks logged-in users from auth pages |

**Never** put `carGuard` on `/add-car` — infinite redirect loop.

---

## Quick reference: What to use when

| Scenario | Method | Wrap in zone? |
|----------|--------|---------------|
| Navigate to a new page | `navigateForward(url)` | ✅ Yes |
| Go back in history | `navigateBack()` (no URL) or `back()` | ✅ Yes |
| Replace entire stack (e.g., login → dashboard, car switch) | `navigateRoot(url, { animated: false })` | ✅ Yes |
| Post-form-submit redirect | `navigateForward('/dashboard')` | ✅ Yes |
| `ion-back-button` fallback | `defaultHref` one level up | N/A |