# Design Document Philosophy

Use this reference when deciding whether a design document is needed, how early to write it, who should review it, or how to preserve its decisions.

## The document is a decision process

A design document exists to expose ambiguity, make tradeoffs reviewable, and obtain informed advice before implementation makes a decision expensive. The artifact matters because it preserves context and rationale, but the conversations and revisions are part of the design work.

Write while meaningful options remain open. A retrospective architecture description may be useful, but it is not a substitute for design review.

## Use the smallest useful document

The amount of documentation should track uncertainty, blast radius, reversibility, and reviewer distance:

- A narrow, reversible choice may need a one-pager or architecture decision record.
- A cross-cutting or contentious system decision usually needs an HLD.
- A complex component whose implementation admits several interpretations may need an LLD.
- A customer proposition that is not yet proven belongs in a PRFAQ before architecture.

There is no universal fill-in-the-blanks design template. Select sections because they resolve a reader question or design risk.

## Review in widening circles

1. Circulate the problem, goals, and outline to close domain experts while the draft is cheap to change.
2. Seek affected teams and specialists for security, privacy, operations, data, and interfaces.
3. Ask reviewers specific questions instead of requesting an undirected "looks good."
4. Record substantial dissent and rejected advice with rationale.
5. Distinguish advice from approval. Consensus may be useful, but it is not always required for a designated owner to decide.

The review method should match the organization. Google's practitioner account emphasizes broad consensus; the conversational architecture model emphasizes advice and recorded dissent without requiring unanimity.

## Preserve the point-in-time decision

Record status, owner, reviewers, decision date, open questions, and outcome. Update the document when the design changes before launch. After adoption, preserve the accepted version and link later amendments or superseding architecture decision records rather than silently rewriting history.

An architecture decision record captures one consequential decision. It complements, but does not replace, a broader design document that establishes system context and interacting choices.

## Failure modes

- Writing after coding has already removed real alternatives
- Treating template completion as design quality
- Seeking consensus from everyone without naming a decider
- Hiding dissent or rejected alternatives
- Letting diagrams substitute for argument
- Maintaining a document as if it describes current reality while leaving superseded decisions unmarked
- Requiring a long HLD for a small, reversible change

## Sources

- [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/) - practitioner account, not official Google policy
- [Hacker News discussion: Writing a good design document](https://news.ycombinator.com/item?id=44779428) - anecdotal critique, not authoritative guidance
- [Martin Fowler: Scaling Architecture Conversationally](https://martinfowler.com/articles/scaling-architecture-conversationally.html)
- [MADR: Markdown Architectural Decision Records](https://adr.github.io/madr/)

The Hacker News discussion is useful for counterexamples and practitioner disagreement. Do not treat comments as policy.
