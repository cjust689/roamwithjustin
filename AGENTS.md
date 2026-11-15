# Repository agent guidance

## Documentation lifecycle

Before implementing a feature:

1. Read `docs/README.md` and the relevant architecture and active-work docs.
2. Inspect source code and tests to determine actual behavior. Older planning
   files and archived briefs are not implementation evidence.
3. Check `superseded_by` metadata; do not use archived plans as instructions.

When implementing:

1. Keep scope bounded and preserve verified architecture unless explicitly
   asked to change it.
2. Update the active implementation checklist and real verification evidence.
3. Update as-built architecture when behavior, interfaces, or limitations
   change.
4. Update `docs/README.md`; archive a proposal only when its remaining work is
   genuinely resolved.
5. Record actual code paths and commands. Never invent verification, commits,
   deployments, credentials, or external-service state.

In handoffs distinguish implemented, tested, partial, blocked, owner action,
and externally unverified work. Run `npm run docs:audit` after managed-doc
changes.

## Public travel content

Before generating or revising any public trip, Place, Atlas, caption, or media
story copy, read `docs/reference/storytelling-framework.md` completely and use
it as the governing voice, evidence, and pacing guide. Also read the relevant
owner-supplied section of `docs/reference/travel-context.md`, then reconcile
both references against canonical source and registered media.

The framework guides how confirmed events are told; it does not promote a
proposal, itinerary idea, plausible sensory detail, or unregistered asset into
fact. Keep unknowns out of public prose or record them as verification work.

Public Journey, Place, Atlas, caption, and media story prose must not use dash
punctuation. Rewrite with commas, colons, periods, or natural phrasing. This
does not apply to technical IDs, slugs, URLs, or private editorial notes. Never
expose workflow labels such as "coming soon," "unconfirmed," "unverified,"
"placeholder," or "pending" to visitors; omit missing material and present the
confirmed content cleanly.
