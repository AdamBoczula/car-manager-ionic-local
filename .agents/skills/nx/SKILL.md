---
name: nx
description: >-
  Explore, run tasks, generate code, find plugins, and link packages in the Nx
  workspace. Use when exploring projects/targets/dependencies, running
  build/test/lint/serve tasks, scaffolding apps/libs, finding/installing plugins,
  or fixing workspace package resolution errors. Do not use for importing external
  repositories (use nx-import instead).
---

# Nx Workspace Skill

Unified skill for all Nx operations: workspace exploration, task execution, code generation, plugin management, and package linking.

---

## 1. Workspace Exploration

Use `nx show projects` to list projects in the workspace. Filter by pattern, tag, target, or type.

```bash
# List all projects
nx show projects

# Filter by type
nx show projects --type app
nx show projects --type lib

# Filter by target
nx show projects --withTarget build

# Get full project config (ALWAYS use this, never read project.json directly)
nx show project <name> --json

# Check available targets
nx show project <name> --json | jq '.targets | keys'

# View dependencies
nx graph --print | jq '.graph.dependencies["<project>"]'
```

## 2. Task Execution

Always prefix with the workspace's package manager (e.g., `npm exec nx`).

```bash
# Single task
nx run <project>:<task>

# Multiple tasks
nx run-many -t <task1> <task2>

# Affected (changed projects only)
nx affected -t <task1> <task2>

# Useful flags
nx run-many -t <task> --skipNxCache   # rerun even if cached
nx run-many -t <task> --nxBail        # stop on first failure
nx affected -t <task> --base=main     # compare against base branch
```

## 3. Code Generation (Scaffolding)

**Always use `--no-interactive`** to prevent prompts that hang execution.

```bash
# Discover generators
nx list @nx/<plugin>

# Get generator options (read --help first)
nx g @nx/<plugin>:<generator> --help

# Dry-run first to verify file placement
nx g @nx/<plugin>:<generator> --name=<name> --dry-run --no-interactive

# Run the generator
nx g @nx/<plugin>:<generator> --name=<name> <options> --no-interactive
```

**Key rules:**

- Default to **non-buildable libraries** unless there's a specific reason for buildable
- Always run `--dry-run` first
- After generating, format: `nx format --fix`
- Verify: `nx run-many -t build,lint,test`
- After creating new packages, use the link-workspace section below to wire up dependencies

## 4. Plugin Management

```bash
# List installed plugins
nx list

# Install a new plugin
nx add @nx/<plugin>
```

## 5. Link Workspace Packages

When importing from sibling packages causes "cannot find module" or TS2307 errors:

### pnpm (this workspace)

```bash
pnpm add <package> --filter <consumer> --workspace
```

Example: `libs/orders` imports `libs/products`:

```bash
pnpm add @my-org/products --filter @my-org/orders --workspace
```

### npm

```bash
npm install <package> -w <consumer>
```

### yarn

```bash
yarn workspace <consumer> add <package>
```

### bun

```bash
bun add <package> --filter <consumer>
```

If the package manager fails:

1. Check `package.json` in consumer package for the dependency
2. Check `tsconfig.base.json` for paths mapping
3. Run `nx sync` to re-sync project graph and tsconfig paths
