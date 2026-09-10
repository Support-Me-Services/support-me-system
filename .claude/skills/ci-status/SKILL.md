---
name: ci-status
description: Sprawdza aktualny status CI/CD dla support-me-system — ostatnie przebiegi backend-ci i deploy-prod, oraz checki na otwartych PR-ach. Tylko do odczytu (gh api/gh run list/gh pr checks) — nic nie uruchamia ponownie i niczego nie zmienia.
---

# ci-status

Invoked on demand (`/ci-status`) to answer "is everything green right now" for **support-me-system** without opening GitHub. Read-only.

## Steps

1. `gh run list --repo Support-Me-Services/support-me-system --workflow=backend-ci.yml --limit 3 --json status,conclusion,displayTitle,createdAt,headBranch`
2. `gh run list --repo Support-Me-Services/support-me-system --workflow=deploy-prod.yml --limit 3 --json status,conclusion,displayTitle,createdAt,headBranch,event`
3. `gh pr list --repo Support-Me-Services/support-me-system --state open --json number,title,headRefName,isDraft,mergeable,reviewDecision`
4. For each open PR from step 3, `gh pr checks <number> --repo Support-Me-Services/support-me-system` (handle "no checks reported" gracefully — it means that branch/path didn't trigger backend-ci, not a failure).
5. Reply directly in chat, in Polish, grouped as: **Ostatni deploy**, **Ostatnie CI (backend)**, **Otwarte PR-y** (each with its check/review status). Lead with anything red/failing; if everything is green/clean, say that plainly in one line rather than listing every success in detail.

Never re-run, cancel, or approve anything — this command only reads state and reports it.
