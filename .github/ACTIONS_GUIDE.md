# 🚀 GitHub Actions Guide

This document explains how to use the comprehensive GitHub Actions workflows set up for the TikTok Streamer Helper project.

## 📁 Workflow Overview

| Workflow | Trigger | Purpose | Status Badge |
|----------|---------|---------|--------------|
| **CI** | Push, PR | Test & Build | ![CI](https://github.com/mxclip/TK-Streamer/workflows/🔄%20Continuous%20Integration/badge.svg) |
| **Release** | Tag push | Build & Publish | ![Release](https://github.com/mxclip/TK-Streamer/workflows/🚀%20Release/badge.svg) |
| **Deploy** | CI Success | Deploy to environments | ![Deploy](https://github.com/mxclip/TK-Streamer/workflows/🌍%20Deploy/badge.svg) |
| **Maintenance** | Schedule | Updates & Security | ![Maintenance](https://github.com/mxclip/TK-Streamer/workflows/🔧%20Maintenance/badge.svg) |

## 🔄 Continuous Integration (ci.yml)

**Triggers**: Push to `main`/`develop`, Pull Requests

### What it does:
- **🐍 Backend**: Tests FastAPI app, checks PostgreSQL/SQLite compatibility
- **⚛️ Frontend**: Builds React app, runs tests, creates build artifacts
- **🧩 Extension**: Validates Chrome extension manifest and builds
- **📺 Teleprompter**: Tests Electron app structure and dependencies
- **🐳 Docker**: Builds and tests container images
- **🔗 Integration**: End-to-end API testing
- **🔒 Security**: Vulnerability scanning with Trivy

### Jobs run in parallel:
```
backend ─┐
frontend ├─→ docker ─→ integration ─→ deploy-check
extension ┤                ↓
teleprompter ┘            security
```

### Manual trigger:
```bash
# Automatically runs on push/PR, no manual action needed
```

## 🚀 Release Workflow (release.yml)

**Triggers**: Git tag push (v*)

### What it does:
- Builds production artifacts for all platforms in parallel
- Publishes Docker images to GitHub Container Registry
- Creates GitHub release with changelog and all artifacts
- Uses modern GitHub Actions for improved reliability

### Artifacts created:
- **Frontend**: Production build archive
- **Extension**: Chrome extension ZIP package  
- **Teleprompter**: Cross-platform executables (Windows, macOS, Linux)
- **Docker**: Backend & frontend images
- **Source**: Complete source code archive

### How to create a release:

#### 1. Tag and push:
```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

#### 2. Workflow runs automatically:
- ✅ Creates GitHub release
- ✅ Builds all components
- ✅ Publishes Docker images
- ✅ Uploads downloadable artifacts

#### 3. Available artifacts:
```
📦 tiktok-streamer-frontend-v1.0.0.tar.gz
🧩 tiktok-streamer-extension-v1.0.0.zip  
📺 tiktok-streamer-teleprompter-win-v1.0.0.exe
📺 tiktok-streamer-teleprompter-mac-v1.0.0.dmg
📺 tiktok-streamer-teleprompter-linux-v1.0.0.AppImage
🐳 ghcr.io/mxclip/tk-streamer-backend:v1.0.0
🐳 ghcr.io/mxclip/tk-streamer-frontend:v1.0.0
```

## 🌍 Deployment Workflow (deploy.yml)

**Triggers**: 
- Automatic: After successful CI on `main`
- Manual: GitHub Actions UI

### Environments:

#### 🚀 Staging Deployment
- **Trigger**: Automatic after CI success
- **URL**: `https://staging.tiktok-streamer.example.com`
- **Features**: Latest main branch, PostgreSQL, monitoring

#### 🏭 Production Deployment  
- **Trigger**: Manual only
- **URL**: `https://tiktok-streamer.example.com`
- **Features**: Tagged versions only, high availability, monitoring

### How to deploy:

#### Staging (Automatic):
```bash
# Push to main branch
git push origin main
# → CI runs → Staging deploys automatically
```

#### Production (Manual):
1. Go to **Actions** → **🌍 Deploy**
2. Click **Run workflow**
3. Select:
   - Environment: `production`
   - Version: `v1.0.0` (specific tag)
4. Click **Run workflow**

### Deployment features:
- ✅ Health checks before/after deployment
- ✅ Database backup before production deploy
- ✅ Automatic rollback on failure
- ✅ Zero-downtime deployment
- ✅ Security checks and SSL verification

## 🔧 Maintenance Workflow (maintenance.yml)

**Triggers**: 
- Schedule: Every Monday at 9 AM UTC
- Manual: GitHub Actions UI

### What it does:
- **📦 Dependencies**: Checks for outdated packages across all components
- **🔒 Security**: Runs vulnerability scans and license compliance
- **🧹 Cleanup**: Removes old workflow runs and artifacts
- **💚 Health Check**: Monitors staging/production environments
- **🔄 Auto-PR**: Creates automated dependency update PRs

### Manual maintenance tasks:

#### Run specific task:
1. Go to **Actions** → **🔧 Maintenance**
2. Click **Run workflow**
3. Select task:
   - `all` - Run all maintenance tasks
   - `dependencies` - Check for updates only
   - `security-scan` - Security scan only
   - `cleanup` - Cleanup old artifacts
   - `health-check` - Environment health check

#### Review maintenance reports:
1. Check **Artifacts** section of completed workflow
2. Download reports:
   - `dependency-report.md`
   - `security-report.md`
   - `cleanup-report.md`
   - `health-report.md`

## 🎯 Common Workflows

### 🔄 Development Workflow:
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "✨ Add new feature"

# 3. Push and create PR
git push origin feature/new-feature
# → CI runs automatically on PR

# 4. After review, merge to main
# → CI runs → Staging deploys automatically
```

### 🚀 Release Workflow:
```bash
# 1. Ensure main branch is ready
git checkout main
git pull origin main

# 2. Create and push release tag
git tag v1.2.0
git push origin v1.2.0
# → Release workflow builds and publishes

# 3. Deploy to production
# Go to Actions → Deploy → Run workflow
# Select: production, v1.2.0
```

### 🐛 Hotfix Workflow:
```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-fix

# 2. Make fix and test
git commit -m "🐛 Fix critical issue"

# 3. Create emergency release
git tag v1.2.1
git push origin v1.2.1
# → Release builds immediately

# 4. Deploy hotfix to production
# Actions → Deploy → production, v1.2.1
```

## 📊 Monitoring & Notifications

### Status Checks:
- **Repository**: Check main README for status badges
- **Deployments**: GitHub Environments show deployment history
- **Artifacts**: Releases page shows all published versions

### Failed Workflow Debugging:

#### CI Failures:
1. Check **Actions** tab
2. Click failed workflow
3. Expand failed job
4. Check logs for specific errors

#### Common issues:
- **Backend**: Database connection, Python imports
- **Frontend**: Node.js version, npm install failures  
- **Extension**: Manifest validation, build dependencies
- **Docker**: Image build failures, resource limits

#### Security Issues:
- Check Trivy scan results in Security tab
- Review dependency vulnerability reports
- Update packages as recommended

## 🔧 Configuration

### Environment Variables:
Set in **Settings** → **Secrets and variables** → **Actions**:

```bash
# Required for production deployment
POSTGRES_USER=production_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=tiktok_streamer_prod
SECRET_KEY=production_secret_key
GRAFANA_PASSWORD=monitoring_password
```

### Environment Protection:
- **Staging**: No protection (auto-deploy)
- **Production**: Requires manual approval + admin review

## 🆘 Troubleshooting

### Workflow Not Triggering:
- Check branch protection rules
- Verify webhook delivery in Settings → Webhooks
- Ensure Actions are enabled in Settings → Actions

### Permission Issues:
- Check repository permissions for GITHUB_TOKEN
- Verify GHCR access for Docker publishing
- Review environment protection rules

### Build Failures:
- Check dependency versions in package.json/requirements.txt
- Verify Docker base image compatibility
- Review resource limits in workflow files

### Deployment Issues:
- Check environment variable configuration
- Verify network connectivity to deployment targets
- Review health check endpoints

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Release Management Best Practices](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Environment Protection Rules](https://docs.github.com/en/actions/deployment/targeting-different-environments)

---

## 🤝 Contributing to Workflows

To modify workflows:

1. Create PR with workflow changes
2. Test in feature branch first
3. Use `workflow_dispatch` for manual testing
4. Update this guide with any changes

**Happy Deploying! 🚀** 