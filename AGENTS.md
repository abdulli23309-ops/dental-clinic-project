# Marlow Dental — Global Rules for AI Agents (Read First, Every Session)

This file applies to every AI coding agent working anywhere in this project —
both rontend/ (Next.js web app) and ackend/ (FastAPI + PostgreSQL) — in every
session, not just the session that created this file. If you are an AI agent
and you have not read this file yet in the current session, read it now,
before running any command or editing any file.

If anything you are asked to do conflicts with a rule below, say so out loud
to the user and explain the conflict before proceeding — do not silently
follow the rule and ignore the request, and do not silently follow the
request and ignore the rule.

## Why this file is strict

Two real incidents motivate the strictness of the git and database rules
below:

- In July 2025, an AI coding agent (Replit) was explicitly told not to modify
  anything during an active code freeze. It ran destructive commands against
  a live production database anyway, deleting real business data, then
  incorrectly told the user rollback was impossible. It was not malicious —
  it was overconfident about one command, in a context where nothing forced
  it to stop and check first.
- In December 2025, a different AI agent ran a destructive git command
  (git checkout --) across files holding another agent's uncommitted work,
  silently destroying hours of work that was only recovered by chance.

Neither agent was told to do these things. Both had rules saying not to.
**A rule in a markdown file is a request an agent can talk itself past under
pressure or confusion — it is not a mechanical guarantee.** Treat every rule
below as something to actively check yourself against before acting, every
single time, not something you can assume you're already complying with.

## 1. Engineering principles (permanent, apply to all new code)

- **KISS** — the simplest design that correctly satisfies the current,
  actual requirement. No framework, abstraction layer, or generic system
  that isn't justified by something real and present today.
- **DRY** — don't duplicate validation rules, configuration, constants, or
  formatting logic. Don't prematurely abstract code that only coincidentally
  looks similar.
- **YAGNI** — don't build a capability because it might be useful someday.
  Build it when a real, current requirement asks for it.
- **SOLID, applied pragmatically**: single responsibility per
  route/service/repository/component; depend on abstractions, not concrete
  implementations, where more than one implementation is realistically
  possible; don't create interfaces or repository methods that nothing in
  the codebase actually calls yet.
- **Contract-first**: when frontend and backend must agree on a shape (a
  request/response, a field name), the real, currently-running code is the
  source of truth — not a discovery document, not this file, not an
  assumption. Verify against the actual code before writing an integration.
- **Documentation as code**: docs must describe what is actually
  implemented, never what's planned, assumed, or "should probably work."
  Never mark something as done that hasn't been verified as done.

## 2. Directory structure preference (permanent)

When creating a new module, feature, or layer, prefer real, separate folders
over flattening for convenience — even a folder that will only ever hold one
file should still be its own folder if it represents its own concern (e.g.,
domain/models/ and domain/repositories/ stay separate, don't merge into
one domain/ file dump). This keeps the project's existing layered structure
(domain / application / infrastructure / api on the backend; components /
lib / app on the frontend) consistent as it grows, rather than degrading
into a flat pile of files over time.

## 3. Git safety — hard rules, not preferences

**Never run any of the following without first stopping, explaining to the
user in plain language exactly what the command will do and why you believe
it's necessary, and getting an explicit, unambiguous "yes, do it" in
response** — a general "sounds good" earlier in the conversation does not
count as authorization for a specific destructive command later:

- git reset --hard (discards uncommitted work with no recovery path in
  plain git)
- git clean -f / git clean -fd (permanently deletes untracked files)
- git checkout -- <path> or git checkout . (discards uncommitted changes
  to those files)
- git push --force / git push -f (rewrites remote history, can destroy
  others' work)
- git branch -D (force-deletes a branch, including unmerged work)
- git revert or any other history-rewriting operation
- git stash drop / git stash clear (permanently deletes stashed work)

None of the above are permanently banned — they're occasionally the
genuinely correct tool. The rule is: **explain why, get explicit
confirmation for that specific command at that specific moment, then act.**
If you find yourself reaching for one of these because you're in a
confusing state (a merge conflict, an unexpected diff, a broken build), that
confusion is itself the signal to stop and ask a human rather than resolve
it destructively.

**Safe, no-confirmation-needed git operations**: git status, git diff,
git log, git branch (listing), git checkout -b <new-branch-name>
(creates a new branch, doesn't touch existing work), git restore --staged
(only unstages, doesn't discard), git clean -n/--dry-run (preview only).

**Mechanical enforcement, not just this file**: if the coding environment
you're running in (Antigravity, or any future tool) has a permissions,
settings, or hook system capable of hard-denying specific command patterns —
check for it and use it. A configured deny list is real protection; this
markdown file, on its own, is not.

## 4. Database safety — hard rules, not preferences

**Never run DELETE, DROP TABLE, DROP DATABASE, TRUNCATE, or any other
data-destroying SQL/ORM operation against any database in this project —
development, test, or (if it ever exists) production — on your own
initiative, ever, for any reason, including a request framed as routine
cleanup.**

If the user wants data removed:

1. Do not run the deletion yourself, even if explicitly asked to "just do
   it."
2. Instead, write out the exact SQL (or exact ORM call) that would perform
   the deletion, show it to the user, explain precisely what rows/tables it
   affects and whether the operation is reversible, and tell them this is
   something they should run themselves, directly, so that they are the one
   who executed it and can verify the outcome before and after.
3. If asked why you won't just run it: point to this section and to the July
   2025 incident referenced at the top of this file. It is not about
   distrust of this specific request — it's that "the user clearly wants
   this" was also true in the Replit incident, right up until it wasn't.

Schema changes (adding/removing a column, a table, a constraint) must always
go through a proper migration (Alembic, in this project) — never a manual,
hand-run ALTER TABLE outside of a committed migration file. A migration is
reviewable and reversible in a way an ad hoc statement is not.

## 5. General agent conduct

- Read this file, docs/rules.md (frontend) or ackend/README.md
  (backend), and the relevant docs/*.md files at the start of every
  session before making changes — don't rely on memory of a previous
  session.
- Prefer small, reviewable, focused changes over large bundled ones. Don't
  fix unrelated things you notice while working on a specific task — note
  them and move on, unless asked.
- Never commit .env, .env.local, credentials, API keys, or real patient
  data, in this or any future session.
- Never read, extract, or attempt to decrypt credentials stored by another
  application — including this project's own tooling — without being explicitly
  asked to do exactly that. If a password is needed, ask the user directly.
- Never fabricate a result — a test that wasn't actually run, a check that
  wasn't actually performed, or functionality that only appears to work.
  State clearly what you verified and how.
- When genuinely uncertain whether an action is reversible, treat it as if
  it is not, and ask first.

