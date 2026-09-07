# PRFAQ Section Guidance

The examples are synthetic. They demonstrate how each section advances the customer and investment argument; they are not claims of actual customer evidence.

## Press release

**Principle:** Make one future customer outcome concrete enough that the FAQs can test whether it is valuable and feasible.

The press release describes a future launch in customer language. Keep it concise enough that every sentence earns space.

**Good example:** "Preview Environments gives an application team an isolated test URL for each code review, removing the queue for a shared integration stage."

### Heading

**Principle:** Name the customer-facing capability in language that conveys the category without internal context.

Name the product, service, or capability in language the customer can understand. Avoid an internal code name as the only identifier.

**Good example:** `Preview Environments creates an isolated test environment for every code review`

### Subheading

**Principle:** State one primary benefit for one customer rather than compressing the feature list.

State the single most important customer benefit and the customer who receives it. Do not stack several unrelated benefits.

**Good example:** `Application teams can validate a change without waiting for a shared integration stage.`

### Date and availability

**Principle:** Make the future launch concrete while labeling any date or market boundary that remains an assumption.

Use a plausible future date and launch scope only when the scenario provides them. Mark unknown launch details rather than inventing precision.

**Good example:** `SEATTLE - Launch date remains conditional on the security and cost gates in the internal FAQ.`

### Summary

**Principle:** Put customer, problem, outcome, and differentiation in the first paragraph.

State who the customer is, the painful problem, the new outcome, and why the change matters. The first paragraph should make the rest of the press release predictable.

**Good example:** "Teams that share one integration stage currently wait for unrelated changes to clear before validating their own code. Preview Environments creates a temporary isolated stage from the code review and returns a test URL within the stated launch target."

### Problem

**Principle:** Describe the customer's current experience through a concrete consequence and evidence, without naming the proposed feature.

Describe the current customer experience through a concrete use case, consequence, and evidence. Avoid solution terminology.

**Good example:** "A team with five open changes serializes validation through one stage. A failed test from one change blocks the remaining four, and the owner must first determine which deployment changed the shared state."

### Solution and experience

**Principle:** Show discovery, use, value, and failure behavior from the customer's perspective before discussing implementation.

Show how the customer discovers, adopts, uses, and receives value from the product. Explain the benefit before implementation. A simple mock or journey may reveal requirements that feature prose hides.

**Good example:** "The developer opens a code review, selects `Create preview`, and receives a URL after the environment passes health checks. The review displays cost, expiry time, and a destroy action."

### Quotes

**Principle:** Use a quote to explain strategic or experiential meaning that the factual paragraphs have already established.

A leadership quote should explain strategic importance. A customer quote should make the before-and-after experience concrete. Draft quotes are hypothetical evidence of intended messaging, not actual testimonials; label them accordingly.

**Good example:** `Draft customer quote: "I can test my change while another team repairs the shared stage, and the review shows exactly which environment contains my code."`

### Getting started

**Principle:** Make adoption requirements and boundaries visible so the press release does not promise an effortless path that the product cannot deliver.

State how a customer obtains the capability, including prerequisites, pricing, region, or account boundaries when known.

**Good example:** "A team connects its deployment template, assigns a cost owner, and enables previews for one repository. The first release supports services that do not require production customer data."

## External FAQ

**Principle:** Answer the questions a customer would ask before trusting, buying, or depending on the promise.

Write questions in the customer's voice. Cover only relevant areas:

- Who can use it and when?
- How does the experience work?
- What does it cost?
- What happens when it fails or is unavailable?
- What data does it use and retain?
- How are security and privacy handled?
- What integrations or prerequisites exist?
- How is support provided?
- What alternatives remain, and why would a customer change?
- What is intentionally not included at launch?

Answers should preserve the press release promise and expose contradictions rather than explaining them away.

**Good example:** "**What happens when creation exceeds 15 minutes?** The request changes to `Delayed`, preserves its diagnostic logs, and does not bill the team for an environment that never reaches `Ready`."

## Internal FAQ

**Principle:** Test the attractive customer narrative against evidence, economics, feasibility, operational burden, and stop conditions.

Order questions from decision-critical premises to delivery depth.

**Good example:** "**What result would stop the investment?** Stop if the pilot cannot create 95% of representative environments inside the target without production data or if steady-state cost exceeds the approved per-review ceiling."

### Customer evidence

**Principle:** Separate observed customer behavior from anecdotes, forecasts, and assumptions.

- What observations, research, support contacts, or behavioral data establish the problem?
- Which customer segments experience it?
- What evidence remains anecdotal or unmeasured?

**Good example:** "Deployment logs show a median 42-minute wait for the shared stage across 1,800 code reviews. Interviews explain the mechanism, but they do not establish willingness to pay."

### Opportunity and differentiation

**Principle:** Explain why the target customer would change behavior when credible alternatives already exist.

- How many customers or interactions are affected?
- What alternative solves the problem today?
- Why is the proposed outcome meaningfully different?
- What behavior must change for adoption?

**Good example:** "Teams can create local test stacks today, but each team maintains its own scripts. The proposal wins only if a repository can adopt the service without owning another deployment system."

### Economics

**Principle:** Expose the assumptions that convert customer use into cost, revenue, or strategic value.

- What revenue, savings, or strategic value is expected?
- What assumptions drive the model?
- What are build and steady-state operating costs?
- What existing product or revenue could be displaced?

**Good example:** "At 20 previews per day and a 4-hour lifetime, compute cost is estimated from the pilot's measured resource profile. The model excludes support labor until the pilot records incident volume."

### Scope and experience

**Principle:** Define the minimum promise and explicit exclusions before implementation expands the product.

- What is the minimum customer promise?
- What are the explicit non-goals?
- Which use cases or regions come later?
- What is the manual or operational fallback?

**Good example:** "The minimum release creates, updates, and expires one-service previews. Shared databases, production-data copies, and multi-region previews are non-goals."

### Feasibility and dependencies

**Principle:** Name the technical or organizational premise that can make the customer promise impossible.

- What technical premise could make the promise impossible?
- Which teams, vendors, data, approvals, or capacity are required?
- What security, privacy, legal, accessibility, or compliance work applies?
- Which dependency has not committed?

**Good example:** "The 15-minute promise depends on the network team assigning isolated addresses inside 3 minutes. That team has not committed to the quota, so the launch date remains open."

### Operations and support

**Principle:** Account for every manual or on-call responsibility created by the future experience.

- Who owns the service and customer support?
- What failure modes affect the promise?
- What on-call, moderation, abuse, reconciliation, or manual work is introduced?

**Good example:** "Developer Experience owns creation failures and expiry cleanup. Application teams own health checks. A leaked environment triggers automatic isolation before an operator investigates."

### Measurement and stop conditions

**Principle:** Define success and harm in terms that can change the investment decision.

- What leading and outcome metrics establish success?
- What guardrails prevent customer harm?
- What experiment or launch stage validates the weakest premise?
- What result causes the proposal to stop or change?

**Good example:** "Proceed when 80% of pilot teams use a preview on three consecutive weeks and creation succeeds within target for 95% of attempts. Stop if security exceptions require production credentials."

### Resources and timeline

**Principle:** Tie staffing and sequence to the weakest dependencies rather than presenting a date detached from evidence.

- What team and skill mix is required?
- What is the critical path?
- Which estimates are ranges or assumptions?

**Good example:** "A two-engineer pilot can start after network quota approval. General availability needs a separate operations owner; the date remains a range until pilot incident load is measured."

## FAQ review checks

- The hardest question appears, even when the answer is not favorable.
- Answers use data or explicit mechanisms.
- Unknowns have owners and validation plans.
- The PR and FAQ do not contradict each other.
- Customer questions precede internal architecture and delivery questions.
- The document can conclude that the idea should not proceed.

## Primary sources

- [Werner Vogels: Working Backwards](https://www.allthingsdistributed.com/2006/11/working_backwards.html)
- [AWS Executive Insights: Product Management at Amazon](https://aws.amazon.com/executive-insights/content/product-management-at-amazon/)
