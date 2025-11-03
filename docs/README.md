# VibeReader Documentation

This directory contains all the documentation for VibeReader, organized for use with MkDocs and GitHub Pages.

## 📁 Structure

```
docs/
├── index.md                    # Home page (from README.md)
├── getting-started/            # Getting started guides
│   ├── quickstart.md          # Quick start guide
│   ├── development.md         # Development setup
│   └── troubleshooting.md     # Common issues and solutions
├── user-guide/                # User-facing documentation
│   ├── features.md           # Feature descriptions
│   └── interface.md          # UI/UX guide
├── technical/                 # Technical documentation
│   ├── specification.md      # Full architecture specification
│   ├── electron.md          # Electron desktop app details
│   ├── nostr.md             # Nostr integration
│   ├── NIP84_HIGHLIGHTS_EXPLAINED.md  # NIP-84 implementation
│   ├── annotation-system.md  # Annotation system details
│   └── payments.md          # Payment integration
├── development/               # Developer documentation
│   ├── migration-guide.md    # v1 to v2 migration
│   ├── migration-plan.md     # Migration planning
│   ├── migration-status.md   # Migration progress
│   ├── implementation-status.md  # Current implementation status
│   ├── navigation-update.md  # Navigation system updates
│   ├── debugging-guide.md    # Debugging tips
│   ├── logging-summary.md    # Logging system overview
│   └── next-steps.md        # Planned features
└── fixes/                     # Bug fixes and refactoring
    ├── index.md              # Overview of all fixes
    ├── issues-fixed.md       # List of resolved issues
    ├── refactor-summary.md   # Refactoring overview
    ├── refactor-complete.md  # Completed refactoring
    └── [specific fixes].md   # Individual fix documentation
```

## 🚀 Building the Documentation

### Install MkDocs

```bash
pip install -r docs-requirements.txt
```

### Local Development

Serve the documentation locally with live reload:

```bash
mkdocs serve
```

Then open http://127.0.0.1:8000 in your browser.

### Build Static Site

Build the static site for deployment:

```bash
mkdocs build
```

The site will be generated in the `site/` directory.

## 🌐 GitHub Pages Deployment

The documentation is automatically deployed to GitHub Pages via GitHub Actions whenever you push to the main/master branch.

### Setup GitHub Pages

1. Go to your repository **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Push to main/master branch to trigger deployment

The documentation will be available at: `https://yourusername.github.io/VibeReaderTwo/`

### Manual Deployment

You can also deploy manually:

```bash
mkdocs gh-deploy
```

## 📝 Writing Documentation

### Markdown Extensions

MkDocs Material supports many helpful extensions:

**Admonitions** (callout boxes):
```markdown
!!! note "Note Title"
    This is a note

!!! warning
    This is a warning

!!! tip
    This is a tip
```

**Code Blocks** with syntax highlighting:
````markdown
```python
def hello():
    print("Hello, World!")
```
````

**Tabs**:
```markdown
=== "Tab 1"
    Content for tab 1

=== "Tab 2"
    Content for tab 2
```

**Task Lists**:
```markdown
- [x] Completed task
- [ ] Incomplete task
```

### Adding New Pages

1. Create a new `.md` file in the appropriate directory
2. Add the page to `nav` section in `mkdocs.yml`
3. Link to it from related pages

Example:
```yaml
nav:
  - Getting Started:
    - New Guide: getting-started/new-guide.md
```

## 🎨 Theme Customization

The documentation uses MkDocs Material theme with:
- Light/dark mode toggle
- Search functionality
- Code copy buttons
- Navigation tabs
- Git revision dates

Customize theme in `mkdocs.yml`:
```yaml
theme:
  name: material
  palette:
    primary: indigo
    accent: indigo
```

## 🔗 Useful Links

- [MkDocs Documentation](https://www.mkdocs.org/)
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)
- [Markdown Guide](https://www.markdownguide.org/)
