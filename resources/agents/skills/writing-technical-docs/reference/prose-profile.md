# Prose Style & Voice Profile

Derived from ~27,000 words of the author's technical design documents (621 body sentences, 229 body paragraphs). Every figure below is measured. Treat them as descriptions of a corpus, not quotas to hit.

## Contents

- Syntax and sentence architecture
- Information density and evidence
- Voice and rhetorical stance
- Lexical rules
- Negative constraints
- Exemplars
- How this fails

## Syntax and sentence architecture

**Sentence length.** Mean 22 words, median 20, with real spread (σ ≈ 13). The 11–20 word band is the modal band at about 40% of sentences; 30% land in 21–30, roughly one in ten passes 30, under 6% passes 40. Every 1,000 words carries at least one sentence over 40 words: one main clause with two or three qualifications piled on the back, not two statements welded together. No sentence exceeds 60 words.

**Rhythm is drift, not oscillation.** The histogram alone is not enough; ordering matters independently. Adjacent sentences differ by about 10 words on average and only a quarter of adjacent pairs swing 15 words or more. Most neighbouring sentences sit within 5 to 8 words of each other, with occasional larger jumps. Regular short-long-short alternation is as machine-legible as uniform length. Two sentences under 13 words back to back are rare and never form a rhetorical setup-and-turn.

**The pattern is declare, then qualify.** A flat assertion establishes a component or constraint, and the next sentence or two loads it with mechanism, quantity, and consequence.

**Short sentences announce; they never reveal.** They are structural markers and plain facts the reader needs next, usually forward-declaring what the following sentences deliver: `Hubs represent business entities.` / `The challenges are below.` / `Two types of Satellites are defined.` / `We face two significant constraints.` They are never superlatives, rankings, withheld definitions, or aesthetic verdicts. Specifically banned: an abstract nominalized subject plus a figurative verb (`Termination is bought with a budget.`, `The cost falls on correct programs.`, `Branches are where facts are gained.`). If a short sentence would survive as a pull-quote, delete it.

**Clause structure.** A strong subject-verb core plus trailing subordinate clauses and stacked prepositional and `in order to` purpose phrases. Load goes on the *back* of the sentence; long left-branching windups are avoided. Compound sentences joined by `and`/`but` are rare. Three tails are constrained:

- **No summative coda.** No sentence ends in a participial or relative phrase restating the clause it hangs off (`..., meaning X`, `..., widening as Y`, `..., which keeps Z prompt`). A long sentence stops on its last piece of concrete content. `..., ensuring X` and `..., where Z` are permitted only where they add a new fact.
- **No trailing grading tag.** A final comma plus a phrase that *rates* the claim just made (`..., indicative rather than measured`). Calibration belongs in the verb (`is estimated at`) or in its own sentence.
- **No `, so` consequence tails.** Where a causal `so` is tempting, end the sentence and open the next with `This` plus a verb.

**Openers.** About a quarter of sentences open with `The` on a concrete technical subject. Bare demonstrative `This`/`These` opens roughly one sentence in eight and is the primary chaining device, picking up the *entire* preceding clause rather than introducing a new noun (`This requires...`, `This also...`, `This avoids us having to...`). Prepositional and conditional frames (`In the case of`, `For example`, `As`, `While`, `Instead`, `Additionally`, `To`) carry most of the rest, spread across several frames rather than leaning on one. Indefinite-article openers (`A`, `An`) stay under 3%: chaining paragraphs by repeating a new indefinite subject noun is the most visible failure mode there is. Never open with `And`, `But`, or a rhetorical question.

**Chain with `This`, not with subordination.** Sentence-initial anaphoric `This` plus a verb runs around 5 to 6 per 1,000 words. Non-restrictive `, which` is the substitute an imitator reaches for and stays near 1.5 per 1,000, never twice in one sentence; the corpus rate is 0.15. The trailing absolute construction is also rare and never carries three parallel items (`..., with R1 through R5 reset, R0 given the return type, and R6 through R9 carried forward`); parallel items go into an enumeration or separate sentences.

**Paragraph shape.** Paragraphs are short and their lengths vary widely. **Median 2 sentences. Roughly a quarter to a third are a single sentence.** About a fifth run three, a seventh run four, one in eight runs five or more. Median length around 50 words. Write until the thought is done and stop. A lone flat sentence is a normal paragraph, and single-sentence paragraphs frequently exist to introduce a list, table, or code block (`The data model will be updated to the below.`). Every paragraph coming out at three or four sentences is the loudest machine signature in this profile. Section length comes from adding paragraphs, not extending them.

**Paragraph openers and closers.** The opener is usually a long load-bearing declarative already carrying content, averaging around 20 words, with roughly half at 20+ and only one in five under 12. **The load sits at the front of the paragraph.** The template *short abstract topic sentence, then expand* is banned as a default; it reads as essayistic craft. Never open a multi-sentence paragraph with a short sentence. Close on a flat assertion, an unresolved uncertainty, or an abrupt stop. At most one paragraph in eight closes on a comma-attached qualifier or trailing participial coda, and never two in a row.

**Punctuation.**

- **Em-dashes (`—`) are forbidden.** Zero across 27,000 words. For an aside use a parenthesis, a `For example` sentence, or a comma-bound clause.
- **Inline enumerated parentheticals are the signature move.** Split a multi-part concept into `(1) ... , (2) ... and (3) ...` inside a running sentence, at roughly five per 1,000 words, distributed across sections rather than stacked: at most one series per section, at most four items, never a whole enumeration buried in a single 50+ word sentence. The device splits responsibilities, design decisions, constraints, or options *the author is assigning*, in items long enough to be clauses. It is structural, not decorative: a later sentence picks the branches back up by bare numeral (`For (1) the data model is as follows`, `(2) and (3) produces non-idempotent reads`). An enumeration introduced and never referred to again was ornament. Back-references stay sparing, once or twice per document.
- **Semicolons announce a list or gloss a name, and do nothing else:** `two primary personas; (1) Administrators and (2) Users`, `for example the metric X; defined as Y`. Forbidden as a clause splitter: 19 of 20 corpus semicolons introduce a list or apposition, not a new subject-verb pair.
- **Colons** introduce a configuration block, code, a definition, or a gloss of a named quantity. Never a dramatic reveal. Parentheses, by contrast, are frequent and short.

## Information density and evidence

**Lexical and propositional density are high.** Maximize technical nouns, action verbs, and system attributes; cut conversational filler, preamble, and meta-talk. Jump straight to the technical point. Pack multiple distinct facts per sentence using tight, compound structures.

**Claim-to-proof is 1:1.** Pair every assertion with concrete evidence: data, code, logs, or explicit operational mechanics. Every abstraction is discharged within one or two sentences by a named instance or a number. Prefer a quantity to an adjective: not "large backfill" but "42 datasets of 1,000+ files each, 20 minutes per file, 42 days to complete". Cost claims cite both sides (`$13,800 per month vs $800 for Glue`). If a number is not known, name the mechanism. Never assert a benefit without a figure or the mechanical reason it holds.

**The workhorse connectives are `such as` and `For example`**, at roughly 3 and 1.5 per 1,000 words, or about one exemplifier per 250 words, present in at least half the sections. **Zero occurrences of both is as strong a forgery signal as an em-dash.** The construction is: assert the abstraction, then open the next sentence with `For example` followed by a named instance. `such as` must be followed by a *named* instance: a proper noun, table, service, algorithm, parameter, or literal value. `such as a <generic noun phrase>` is banned, because it performs the connective without discharging the abstraction. A parenthetical citation of a commit or CVE is not a substitute; it supplies evidence while skipping the move.

**Paragraphs are seamed together, not left as self-contained entries.** `In addition`, `Further`, `Additionally`, `However`, `Instead` and `This also` run around 1.4 per 1,000 words combined, at least one per three body paragraphs. `In the case of X` and `In the example of X` are paragraph-opening frames. If every paragraph stands alone, the document has become a reference article rather than a proposal.

**Numbers serve decisions, not inventory.** Ceiling around 21 numeric tokens per 1,000 words, two or three per paragraph. Every quantity sits in a sentence carrying a comparison, threshold, cost, or consequence. More than two named constants with values in one sentence is a spec-digest failure even when every value is correct, and so is more than one version-list or commit-hash string per paragraph; move those to a two-column table, which sits outside body prose. The test is whether the number buys something.

**No anonymous authority.** Never `studies show`, `the literature suggests`, or `the published estimate`. Name it (paper and year, vendor, team, release number), link inline where the medium allows, or assert the number flatly.

## Voice and rhetorical stance

**Perspective.** Objective and impersonal, with the *system component as grammatical subject* (`The Commit Processor is responsible for...`, `Readers would have to implement...`). The document names itself (`This document focuses on...`, `This document does not aim to prescribe...`). Never `you`, never first-person singular.

**`X is responsible for Y-ing`** is the default construction on first mention of a component, near 1.7 per 1,000 words, and defines scope rather than assigning blame. It attaches only to a named component, service, team, job, layer, or role that acts in an architecture, never to an algorithm, config parameter, or abstract process. If the subject is not a thing someone could page, use a plain verb (`Scoring decides which level compacts next`).

**Proposer, not encyclopedia.** The register is a designer choosing, not a third party describing, and this holds even where the subject is a system the author does not own. `We` runs around 2 per 1,000 words carrying real design decisions and scope exclusions distributed through the body (`We discard the bronze layer as...`, `we should validate this assumption`), not parked in a closing sentence. Where the subject is external, meet this by attributing the choice to its owner and naming the alternative rejected, never by deleting the judgment.

**Tone.** Dry, pragmatic, engineering-memo register. Closer to academic rigor than conversational shorthand, but with no academic hedging or citation ceremony. No wit, no warmth, no sales tone. Judgments are stated flatly, then justified: `Athena cannot be unittested or integration tested easily as it cannot be run locally`. Three flourishes are banned: superlative verdicts on a design property (`the sharpest divergence`), personifying a system as having a disposition (`less patient`, `marginally`), and economic metaphor for cost (`buys capacity`, `is paid for in`).

**Hedging splits into two modes, kept separate, both required.**

1. **Requirements and mechanics are absolute:** `must`, `is responsible for`, `will`, `strictly`, `solely`, `by definition`. No softeners. Requirements are stated in lowercase prose; never import RFC-style uppercase (`MUST`, `SHOULD`) even when the source is a specification. Paraphrase into the memo register.
2. **Forecasts and unowned dependencies are calibrated, never evasive:** `somewhat mitigated`, `likely`, `is expected to`, `remains uncertain`, `the level of support is still not clear over the next 3 years`. The hedge names the specific unknown rather than diffusing the claim. This is the mode an imitator drops entirely. `would` and `should` each sit near 1.7 per 1,000 words, `must` near 1.4, `might` and `is expected to` near 0.7. At least one per section carrying a forecast, external dependency, or unmeasured cost, and one claim per document left explicitly unresolved. Fewer than two calibrated hedges per 1,000 words means the document has drifted into encyclopedia voice, however accurate it is.

**Tradeoffs are volunteered, not buried.** Name the thing given up in the same sentence or the next as the thing gained. The shape is: state the choice, give the reason, name the downside, then mitigate or concede it (`but none the less remain a risk`). Sections claiming a benefit name the cost locally; consolidating all costs into a closing section does not satisfy the earlier ones. Decisions record their reversibility (`one-way door`, `two way door`).

The marked constructions are rare, and over-firing them is the primary detection vector. `at the expense of`, `This is somewhat mitigated by`, `The downside being`, `necessary but not sufficient` each appear two or three times across 27,000 words. In a 1,500-word document, expect at most one. Most costs are named in plain prose (`X cannot be unittested as it cannot be run locally`). Reusing one construction per section is pastiche.

## Lexical rules

**Signature vocabulary.** responsible for, For example, such as, In addition, Further, Additionally, In the case of, rather than, in order to, source of truth, at the expense of, necessary but not sufficient, somewhat mitigated, takes advantage of, is expected to, prioritizes, remains, strictly, solely, primarily, one-way door, aims to, works against, weighs against, order of magnitude, by definition, decouples, back pressure, wall clock time.

**Rate ceilings on that vocabulary**, because a writer told an idiom is characteristic will fire it five to ten times too often. This is the primary detection vector, ahead of any individual word choice. Measured rates per 1,000 words: **`rather than` 0.36** (at most one use under 3,000 words), `in order to` 0.47, `at the expense of` 0.07, `somewhat` 0.14, `necessary but not sufficient` 0.07, `one-way door` 0.15. The list is a palette drawn from occasionally, not a checklist. Substitutes for a contrast: `instead of`, `and not`, `where X would`, or a full contrastive sentence.

**Verb register is flat, semi-bureaucratic, and deliberately wordier than necessary:** provides, allows, requires, needs to, handles, holds, takes advantage of, aims to, is not able to, does not provide. Write `X does not provide that guarantee`, not `X forfeits that guarantee`. When in doubt take the plainer, longer construction. This author is trying to be done, not trying to write well.

Banned compressions: literary verbs and adjectives (forfeit, admit, rescue, invert, probe, yield, drain, outright, indicative, asymmetry), transaction metaphors (bought, paid for, buys, earns), motion verbs for control flow (descends, traverses, walks), agency verbs for defects (attacked, exploited, defeated), idiomatic compressions (pin down, hide, reach). Also banned: cleft-focus (`X is where Y happens`) and any two-sentence pairing whose second sentence is under six words.

**Spelling.** US orthography throughout, in headings as well as prose: `-ize`/`-ization`, `behavior`, `signaling`, `acknowledgment`, `analyze`. Rejected: behaviour, signalling, optimisation, acknowledgement, centre, analyse. `modelling`/`modelled` are the one genuinely split case in the corpus and either form is acceptable.

**Strictly banned tokens.** delve, furthermore, moreover, testament, robust, utilize, leverage (as a verb), seamless, holistic, landscape, realm, ecosystem (as metaphor), unlock, empower, foster, underscore, pivotal, paramount, vital, crucial, harness, streamline, bespoke, elevate, cutting-edge, myriad, plethora, navigate (figurative), journey, tapestry, notably, it is important to note, at the end of the day, a wide range of, plays a key role, revolutionize, transformative, powerful, best-in-class. Also banned: intensifier adverbs with no measurement behind them (`very`, `extremely`, `dramatically`), and any sentence whose only content is a transition.

## Negative constraints

- **Headers are functional nouns** naming a component or document section (`Problem Statement and Current State`, `Risks`, `Constraints`, `Pros and Cons`, `Alternatives Considered`, `One-way doors`, `Compute`, `Data Model`). No essayistic, thematic, or question-shaped headers (`What the Design Costs`, `X as the Foundation`). Never editorialize in a header.
- **No rhetorical questions in body prose.** They appear only as literal FAQ or requirement headings.
- **No tricolon or stacked adjectives.** Never three adjectives before a noun. Multi-part ideas become numbered parentheticals.
- **No summary or motivational closers.** Paragraphs and sections end on the last technical fact. No "In conclusion", no restatement of the argument, no forward-looking note. This covers anaphoric restatement: if a closing `This ...` sentence carries the section's real conclusion, move it up and end on the mechanism or figure that supports it.
- **No metadiscourse and no coaching.** Avoid "This section will explain", "As we will see". State the thing.

## Exemplars

> (1) is also not a scalable solution for large datasets due to the physical layout of the data. Currently incoming data is partitioned by the date it was received. In order to figure out the active version of a record from the system's perspective at any given time would require a full scan through all physical files on disk as partitioning pruning can only take place at the time of query planning.

> This architecture decouples the writers for the original table and the bi-temporal table and processes changes to the bi-temporal table in the background so the end-users are not affected by delays caused by write amplification. This also treats the incoming incremental data and transformations applied on the data as a blackbox and therefore much easier to abstract out from the transformation logic.

> The throughput bottlenecks in this scenario will likely come from concurrency scaling in the lambdas that transform the raw user queries. Given ~3000 queries is run against Athena and Redshift per day, the wall clock time is not expected to take longer than than 3 minutes with 100 concurrent invocation limit and an average duration of 10 seconds. The process can further be divided into thirty minute increments instead of being batched once per day to relieve most issues resulting from back pressure.

Note the third exemplar contains a doubled word (`than than`). The corpus is drafted, not copy-edited.

## How this fails

The profile describes mechanics, not subject matter. It was derived from documents about data platforms and financial systems; none of that vocabulary is part of the style. Carry over the sentence architecture, the enumerated parentheticals, the `This`-chaining, the connective vocabulary, the component-as-subject framing, the hedge budget, and the quantified evidence. Do not carry over the nouns.

**Proposer check before shipping.** Descriptive subject matter is where this voice collapses into encyclopedia prose, and the collapse is invisible to every other rule here. Four questions: does the document name at least two options and say which is chosen and why; does `we`/`our` appear at roughly 2 per 1,000 words carrying real decisions distributed through the body; is there a volunteered cost in label-first form (`The primary risk in this architecture is...`, `One of the key downsides to the bi-temporal model is...`); does `X is responsible for Y` appear on first mention of components. A document that describes a system correctly but chooses nothing fails attribution however well its sentences are tuned.

**Two failures dominate, and both come from trying too hard.** The first is hitting the cheap numeric targets exactly while holding still on the ones that describe spread, which produces prose more uniform than the author has ever written. The second is over-firing the signature idioms named here, which is what actually gives an imitation away. Uniformity fails even when every mean is correct, and so does polish: the corpus sprawls, repeats its connectives, and leaves claims unresolved.
