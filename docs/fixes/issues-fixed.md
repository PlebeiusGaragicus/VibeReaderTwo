# Issues Fixed - Dependency Errors

## Summary

Fixed critical runtime error and deprecation warnings encountered during first run.

## Issues Resolved

### 1. ❌ → ✅ SQLAlchemy Greenlet Error (CRITICAL)

**Error Message:**
```
ValueError: the greenlet library is required to use this function. No module named 'greenlet'
ERROR: Application startup failed. Exiting.
Backend process exited with code 3
```

**Root Cause:**
SQLAlchemy 2.0 with async support requires the `greenlet` library for coroutine handling, but it wasn't listed in `requirements.txt`.

**Fix Applied:**
Added `greenlet==3.0.3` to `backend/requirements.txt`

**File Changed:**
- `backend/requirements.txt` - Added line 5: `greenlet==3.0.3`

---

### 2. ⚠️ → ✅ npm Deprecation Warnings

**Warnings:**
```
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory
npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
npm warn deprecated boolean@3.2.0: Package no longer supported
```

**Root Cause:**
- Old versions of Electron and electron-builder using deprecated dependencies
- These are transitive dependencies (not directly used by our code)

**Fix Applied:**
Updated `desktop/package.json`:
- `electron`: `28.0.0` → `33.2.0` (latest stable)
- `electron-builder`: `24.9.1` → `25.1.8` (latest)
- `electron-store`: `8.1.0` → `10.0.0` (latest)
- Added `overrides` section to force newer versions of deprecated packages

**Files Changed:**
- `desktop/package.json` - Updated versions and added overrides

---

### 3. ⚠️ npm Audit Vulnerability

**Warning:**
```
1 moderate severity vulnerability
```

**Fix:**
The updated packages should resolve this. After running `./fix-dependencies.sh`, the vulnerability count should drop to 0 or be in transitive dependencies we can't control.

---

## How to Apply Fixes

### Option 1: Automated (Recommended)
```bash
./fix-dependencies.sh
```

### Option 2: Manual

**Backend:**
```bash
cd backend
source venv/bin/activate
pip install greenlet==3.0.3
# Or reinstall everything:
pip install -r requirements.txt
```

**Desktop:**
```bash
cd desktop
rm -rf node_modules package-lock.json
npm install
```

---

## Verification

### Test Backend
```bash
cd backend
source venv/bin/activate
export VIBEREADER_DESKTOP=true
uvicorn app.main:app --reload

# Should see:
# ✓ Desktop directories initialized
# ✓ Database initialized
# ✓ Ready!
```

### Test Desktop App
```bash
./start-dev.sh
# Choose option 4

# Should see:
# - No greenlet error
# - Fewer/no npm warnings
# - Electron window opens successfully
```

---

## Technical Details

### Why Greenlet is Required

SQLAlchemy 2.0 uses greenlets for async/await support:

```python
# This requires greenlet:
async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)
```

Without greenlet, SQLAlchemy can't bridge sync and async code.

### Why Package Updates Matter

- **Security**: Newer versions patch vulnerabilities
- **Compatibility**: Latest Electron works better with modern macOS/Windows
- **Performance**: Newer versions are faster and more stable
- **Deprecations**: Avoid warnings and future breakage

### Package Override Explanation

```json
"overrides": {
  "inflight": "npm:@aashutoshrathi/inflight@^1.0.0",
  "glob": "^11.0.0"
}
```

This tells npm to use maintained replacements for deprecated packages, even if transitive dependencies request the old versions.

---

## Prevention

### For Future Development

1. **Always specify exact versions** in requirements.txt/package.json
2. **Test on clean environments** before committing
3. **Run `npm audit` and `pip check`** regularly
4. **Keep dependencies updated** quarterly

### CI/CD Recommendations

```yaml
# .github/workflows/test.yml
- name: Check for vulnerabilities
  run: |
    npm audit --audit-level=moderate
    pip check
```

---

## Additional Resources

- [Troubleshooting Guide](../getting-started/troubleshooting.md) - Full troubleshooting guide
- [SQLAlchemy Async Docs](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Electron Releases](https://www.electronjs.org/releases/stable)
- [npm overrides](https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides)
