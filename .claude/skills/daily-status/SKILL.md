---
name: daily-status
description: Analizuje aktualny stan lokalnego repozytorium support-me-system (branch, niezacommitowane zmiany, rozjazd z main, zaległe do wypchnięcia commity, czy backend wyprzedził wygenerowany klient API, status CI/PR) i mówi krótko, co dokładnie trzeba dziś zrobić, w jakiej kolejności. Tylko do odczytu — nic nie fetch'uje poza `git fetch`/`gh api`, nic nie commituje, nie merge'uje i nie pushuje.
---

# daily-status

Invoked on demand (`/daily-status`) by Kateryna at the start (or during) a work session on
**support-me-system**, when the project is being built by multiple people and changes land daily.
Answers "what do I actually need to do right now" as a short, ordered action list — it does not
perform any of the actions itself.

## Hard rules

- **Read-only.** Only `git status`, `git fetch`, `git log`/`git rev-list` (no merge/rebase/pull),
  `gh pr view`/`gh pr checks`/`gh run list`. Never `git merge`, `git push`, `git commit`, never
  write/edit any file in the repo.
- Reply **directly in chat**, in **Polish**, as a short prioritized checklist — not a wall of raw
  command output. Lead with whatever is most urgent/blocking.

## Steps

1. **Local working tree**: `git status --short` and `git branch --show-current`. Note any
   uncommitted or untracked changes, and which branch she's on (expected: a feature branch, e.g.
   `Kasia` — flag it if somehow on `main`).

2. **Sync check with main**: `git fetch origin main --quiet`, then
   `git rev-list --left-right --count origin/main...HEAD`. This gives (commits on main not yet
   local) vs (local commits not on main).
   - If main is ahead: list what's new with
     `git log --oneline HEAD..origin/main -- ':!**/generated/**'` (skip merge commits) so she knows
     *what* she's behind on, not just the count.
   - If genuinely nothing new on main, say so plainly.

3. **Unpushed work**: compare local branch against its remote tracking branch
   (`git log @{u}..HEAD --oneline` — handle gracefully if there's no upstream yet) to flag commits
   sitting locally that haven't been pushed.

4. **Backend/API-client staleness**: check whether any commit reaching HEAD from step 2's main sync
   (or already merged but not yet acted on) touches backend paths that affect the generated API
   client: `git log --oneline HEAD@{1}..HEAD -- backend/api-gateway backend/organization backend/initialization backend/proto-contracts 2>/dev/null`
   (only meaningful right after a merge — if nothing merged this run, skip). If backend contract
   code changed, flag that `docker compose up -d --build` + refresh
   `backend/api-gateway-openapi.json` + `pnpm generate:api` (from `frontend/packages/api-client`,
   using `node ../../node_modules/orval/dist/bin/orval.js --config orval.config.ts` if the plain
   `pnpm`/`turbo` binary isn't resolving) is likely needed before the frontend will build cleanly.

5. **CI / PR status for her own work**: if the current branch has an open PR,
   `gh pr view --repo Support-Me-Services/support-me-system <branch> --json number,title,mergeable,reviewDecision,statusCheckRollup`
   — report merge conflicts, failing checks, or pending review plainly. If no PR is open yet from
   this branch, say so (not an error).

6. **Summarize as an ordered checklist**, most urgent first, e.g.:
   - "Najpierw: rozwiąż merge conflict w PR #1 (CI failing)."
   - "Potem: `git fetch` + `git merge origin/main` — 3 nowe commity czekają."
   - "Backend się zmienił → po merge'u przebuduj i wygeneruj klient API."
   - "Masz 2 niewypchnięte commity — pamiętaj o `git push`."
   - If everything is clean and up to date, say that in one line — don't pad the reply with a
     checklist of nothing.

Never take any of the suggested actions automatically — this command only reports and recommends;
Kateryna decides what to run next (or asks Claude to do it as a separate, explicit step).
