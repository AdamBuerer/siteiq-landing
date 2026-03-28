SiteIQ landing — backup before home-only build variant
Created: 2026-03-27

What was saved
1) Git annotated tag: backup-2026-03-27-pre-home-only (points at the same commit as this backup)
2) Git branch: backup/pre-home-only-2026-03-27 (same commit; safe pointer for pushes)
3) This folder: siteiq-dist-2026-03-27.zip — production build output (dist/) right before home-only work

Restore the built site from the zip
  unzip siteiq-dist-2026-03-27.zip -d /path/to/serve

Restore the exact source tree from git
  git checkout backup-2026-03-27-pre-home-only
  # or: git checkout backup/pre-home-only-2026-03-27

Push the tag/branch to origin (optional, for remote backup)
  git push origin backup-2026-03-27-pre-home-only
  git push origin backup/pre-home-only-2026-03-27
