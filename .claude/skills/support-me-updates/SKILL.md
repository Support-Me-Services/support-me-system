---
name: support-me-updates
description: Sprawdza, co zmieniło się w repozytorium support-me-system od ostatniego sprawdzenia (commity, PR-y, issues) i podsumowuje po polsku, co zrobiono/naprawiono. Tylko do odczytu z GitHuba — nic nie zapisuje ani nie komentuje w repo. Wynik trafia wyłącznie do prywatnego pliku lokalnego, poza repozytorium.
---

# support-me-updates

Invoked on demand (slash command `/support-me-updates`) by Kateryna to see what changed in the **support-me-system** GitHub repo since she last checked. This is a private, read-only reporting tool — never write anything back to GitHub, and never store the report anywhere inside a git-tracked folder.

## Hard rules

- **Read-only against GitHub, always.** Only use read commands: `gh api repos/.../commits`, `gh pr list`, `gh issue list`, `gh pr view`, `gh issue view`. Never `gh pr comment`, `gh issue comment`, `gh pr merge/close`, `gh issue close`, never `git commit`/`git push` to this repo, never edit any file inside this repository.
- **Nothing tracked in git.** All state and output for this feature lives at `C:\Users\Lenovo\Desktop\support-me-updates-private\` — a folder that sits outside this repository (`C:\Users\Lenovo\Desktop\Git\`) and must never be. Do not create or reference any file for this feature inside the repo itself.
- **Private, for Kateryna only.** Don't post the summary anywhere public. It's reported directly to her in the chat reply, plus appended to her local log file.
- Output language: **Polish**.

## State file

`C:\Users\Lenovo\Desktop\support-me-updates-private\state.json`:
```json
{
  "repo": "Support-Me-Services/support-me-system",
  "last_checked_utc": "...",
  "last_commit_sha": "...",
  "last_pr_cursor": { "<pr_number>": "<last_seen_updatedAt_iso>" },
  "last_issue_cursor": { "<issue_number>": "<last_seen_updatedAt_iso>" }
}
```
Read it first. If it doesn't exist, treat `last_checked_utc` as 7 days ago and the cursors as empty.

## Steps

1. Read `state.json`.
2. New commits: `gh api "repos/Support-Me-Services/support-me-system/commits?per_page=30" --jq '.[] | {sha: .sha[0:7], author: .commit.author.name, date: .commit.author.date, message: (.commit.message | split("\n")[0])}'` — keep only commits newer than `last_commit_sha` (walk from the top until you hit that sha, or until `date` is older than `last_checked_utc` if the sha isn't found e.g. after a force-push). Skip pure merge commits ("Merge ...") — not informative on their own.
3. PR changes: `gh pr list --repo Support-Me-Services/support-me-system --state all --json number,title,body,state,mergedAt,closedAt,createdAt,updatedAt,author,url --limit 30`. Keep PRs whose `updatedAt` is newer than the cursor stored for that PR number (or not yet in the cursor map).
4. Issue changes: same idea with `gh issue list --repo Support-Me-Services/support-me-system --state all --json number,title,body,state,closedAt,createdAt,updatedAt,author,url --limit 30`.
5. For each new/changed item, write ONE concise Polish sentence: what was done or fixed, based on the commit message / PR title+body / issue title+body. Use plain, factual language — this is a private changelog, not marketing copy.
6. **Reply to Kateryna directly in chat**, grouped by type (Commity / Pull requesty / Issues), most recent first. If nothing changed since last check, say so plainly — don't pad the reply.
7. Append the same entries to `C:\Users\Lenovo\Desktop\support-me-updates-private\log.html`: it has a day-grouped card layout (see the file for the existing markup/CSS pattern — match it, add a new `.day` block for today if one doesn't already exist, insert rows in reverse-chronological order within the day). Never touch anything under `C:\Users\Lenovo\Desktop\Git\`.
8. Update `state.json`: `last_checked_utc` = now (UTC), `last_commit_sha` = newest commit sha seen, `last_pr_cursor`/`last_issue_cursor` = updated with each item's `updatedAt`.
9. If genuinely nothing is new, still update `last_checked_utc` (so the next run's window is accurate) but don't touch `log.html`.
