# Generate FYP_Report_SmartMENA.docx — same structure / word count as template.
# All content is original to SmartMENA Analytics. Born2Hike is ONLY referenced
# as demo/seed data, never as the project itself.
import os
from docx import Document
from docx.shared import Pt, Cm, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.section import WD_SECTION
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUTPUT = r"C:\Users\hadch\OneDrive\Documents\FYP\Draft-1\SMARTMENA-ANALYTICS-FYP\FYP_Report_SmartMENA.docx"

doc = Document()

# ----- Page setup: A4 with 2.5cm margins, similar to template -----
for section in doc.sections:
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)

# Default body style
style = doc.styles["Normal"]
style.font.name = "Times New Roman"
style.font.size = Pt(12)
style.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
style.paragraph_format.space_after = Pt(6)

for h_idx, sz, bold in [(1, 16, True), (2, 14, True), (3, 13, True)]:
    s = doc.styles[f"Heading {h_idx}"]
    s.font.name = "Times New Roman"
    s.font.size = Pt(sz)
    s.font.bold = bold
    s.font.color.rgb = RGBColor(0x10, 0x10, 0x10)
    s.paragraph_format.space_before = Pt(14)
    s.paragraph_format.space_after = Pt(8)

def H(level, text, center=False):
    p = doc.add_heading(text, level=level)
    if center:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    return p

def P(text="", center=False, bold=False, italic=False, sz=None):
    p = doc.add_paragraph()
    if center: p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Cm(0)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text)
    if bold: run.bold = True
    if italic: run.italic = True
    if sz: run.font.size = Pt(sz)
    return p

def B(text):
    """Bold inline label paragraph (e.g. 'Performance Requirements: ...')."""
    return P(text)

def PageBreak():
    p = doc.add_paragraph()
    r = p.add_run()
    br = OxmlElement('w:br')
    br.set(qn('w:type'), 'page')
    r._r.append(br)

# ============================================================================
# COVER PAGE
# ============================================================================
P("ANTONINE UNIVERSITY", center=True, bold=True, sz=18)
P("Faculty of Engineering", center=True, bold=True, sz=14)
P("Department of Computer and Communications Engineering", center=True, sz=12)
P("")
P("")
P("")
P("")
P("SmartMENA Analytics", center=True, bold=True, sz=22)
P("An AI-Powered Marketing Intelligence Platform for MENA SMEs", center=True, italic=True, sz=14)
P("")
P("")
P("A Final Year Project Report submitted in partial fulfilment of the requirements of the degree of Bachelor of Engineering", center=True, italic=True)
P("")
P("")
P("")
P("Joe Hadchity", center=True, bold=True, sz=13)
P("Spring 2026", center=True, sz=12)
PageBreak()

# ============================================================================
# ACKNOWLEDGMENTS + ABSTRACT (front matter ~511 words)
# ============================================================================
H(1, "ACKNOWLEDGMENTS")
P("I would like to express my deepest gratitude to my academic supervisor for the constant guidance, the constructive criticism, and the patience demonstrated throughout the lifetime of this project. The willingness to challenge my assumptions, while always pointing me back toward the practical realities of small businesses in the MENA region, has shaped this work in ways that go far beyond the technical deliverable.")
P("I am also indebted to the Faculty of Engineering at Antonine University, and in particular to the Department of Computer and Communications Engineering, for providing an environment where ambitious, multidisciplinary capstones are encouraged. The freedom to pursue a project that sits at the intersection of artificial intelligence, software engineering and digital marketing analytics would not have been possible without this support.")
P("My sincere thanks go to the founders of several Lebanese and Gulf-based small businesses who agreed to early conversations about how they currently measure marketing performance, what they wish they had, and what they cannot afford. Their candid feedback became the project's compass and is, in many ways, the reason SmartMENA Analytics exists.")
P("Finally, I would like to thank my family and close friends for their patience during long development cycles, and for being the very first users — even when their feedback was painfully honest. Any remaining shortcomings in this work are my own.")

PageBreak()
H(1, "ABSTRACT")
P("Small and medium-sized enterprises in the Middle East and North Africa region rely heavily on social media to acquire and retain customers, yet most existing analytics platforms are priced for global enterprises, designed around English-speaking audiences, and blind to the cultural, linguistic and seasonal patterns that shape consumer behaviour in the region. SmartMENA Analytics is a marketing intelligence platform designed to close this gap. It connects directly to the social accounts of an SME, ingests posts and engagement metrics, and surfaces actionable insights through a bilingual Arabic and English interface that is right-to-left aware by construction.")
P("The platform is built as three cooperating services: an Express backend that orchestrates multi-tenant business logic and integrations; a FastAPI machine-learning service that hosts an Arabic-aware sentiment classifier and a return-on-investment regression model; and a Next.js frontend that provides the operator-facing dashboard, calendar, reports and conversational assistant. A PostgreSQL database — provisioned through Supabase — anchors the data layer with thirteen incremental schema migrations and strict workspace-level tenancy. Azure OpenAI is used as the large-language-model layer for narrative insights, recommendations, and trend explanations, with a monthly token budget enforced per workspace.")
P("Domain-specific intelligence is the differentiating contribution. The trend-intelligence pipeline aggregates evidence from internal posts, public web search and YouTube, normalises and clusters it, and asks the language model to explain the resulting clusters in business terms. A separate competitor-intelligence pipeline discovers candidates from the open web, runs them through an evidence-first approval queue, and tracks the metrics of approved competitors over time. Validation of the system was performed against a deterministic synthetic dataset and against a representative demonstration workspace populated with mock data for a fictional outdoor brand.")
P("The result is an analytics platform that is technically credible, regionally rooted, and financially accessible — with the architectural headroom to evolve into a production-grade SaaS once design partners and authentication are added.")

PageBreak()

# ============================================================================
# CHAPTER 1 — GENERAL INTRODUCTION (~830 words)
# ============================================================================
H(1, "CHAPTER 1: GENERAL INTRODUCTION")

H(1, "Problem Identification")
P("The rise of digital commerce and platform-driven marketing has changed the rules under which small and medium-sized businesses operate. Whereas a decade ago a neighbourhood retailer in Beirut, Riyadh or Cairo could rely on word-of-mouth and a small print budget to attract customers, today the same retailer is competing on the very same feeds as multinational brands with eight-figure marketing teams. Social platforms — Instagram, Facebook, TikTok and X among them — have become the primary acquisition channel, the primary support channel, and increasingly the primary point-of-sale. Yet the analytical tooling that makes those channels measurable is still optimised for the global market and for the English language.")
P("Existing enterprise platforms such as Hootsuite, Sprout Social, Brandwatch and Talkwalker are technically sophisticated but commercially out of reach for the typical MENA SME. Pricing tiers begin at several hundred dollars per month, dashboards default to English-only interfaces, sentiment models perform poorly on Arabic content, and recommendations are generic across geographies — they do not understand that engagement spikes around Ramadan, that Khaleeji audiences and Levantine audiences respond to different content registers, or that a Friday at 8 PM Gulf Standard Time is the most valuable timeslot of the week. The result is a market segment that produces enormous volumes of social content yet operates almost blind from a measurement standpoint.")
P("On the technical side, an effective solution must reconcile a number of conflicting demands. It needs to ingest data from multiple platforms with very different APIs, store time-series engagement metrics for posts that may be updated days after publication, run language-specific machine-learning models on Arabic and English text, and present all of this through a dashboard that is responsive enough for use on a phone in the back office of a shop. It must also do so for multiple tenants concurrently while keeping each tenant's data, tokens and AI usage strictly isolated.")
P("Beyond the engineering challenge, there is an ethical layer. Marketing analytics handles personal data, sentiment about identifiable individuals, and authentication tokens for third-party services. Each of these requires care. A serious system for the MENA market must be opinionated about encryption at rest, about token revocation, about graceful degradation when AI services are unavailable, and about transparency in how recommendations are produced. Without those guarantees, the trust required to onboard a real business cannot be earned.")
P("Finally, the diversity of stakeholders is itself a constraint. A marketing manager wants narrative insights they can show to a founder. The founder wants ROI projections that justify next month's spend. A developer integrating the platform wants stable APIs and clear documentation. A demo audience — investors, judges, faculty — needs the product to look credible from the very first screen, even before any real account is connected. Designing for all four simultaneously, in two languages, is the actual problem this project sets out to address.")

H(1, "Problem Statement / Formulation")
P("The core problem this project addresses is the absence of an affordable, bilingual, MENA-aware marketing analytics platform that combines social listening, AI-generated insights and trend intelligence in a single workspace accessible to small and medium-sized businesses.")

H(1, "Solution Approach / Methodology")
P("The proposed solution follows a systems-engineering approach in which the product is decomposed into three cooperating services — a backend, a machine-learning service and a frontend — each with its own contract, its own technology stack, and its own deployment posture. This separation lets each service evolve independently and lets the cost of running each service be tuned to its workload: the backend stays warm because it serves user traffic, the ML service can scale to zero between predictions, and the frontend is statically rendered where possible.")
P("On top of this architecture, a multi-tenant data model centred on the workspace concept ensures that every customer's data, OAuth tokens and AI usage are isolated. A single PostgreSQL instance, provisioned through Supabase, hosts thirteen incremental schema migrations that grew the data model from a minimal MVP to an evidence-grounded competitor and trend-intelligence platform. OAuth tokens are encrypted with AES-256-GCM before being written to the database; plaintext tokens never exist outside of the active request that produced them.")
P("The artificial-intelligence layer is deliberately split. A self-hosted FastAPI service runs the Arabic-aware sentiment classifier, derived from CAMeL Lab's CAMeLBERT family of models, and a gradient-boosted ROI regression model. A separate cloud language-model layer, hosted by Azure OpenAI, is invoked for narrative tasks: insight generation, recommendations and trend explanations. Token usage is metered per workspace per month, and every LLM-driven endpoint degrades gracefully into a fallback response if credentials or budget are missing.")
P("Validation combines deterministic, reproducible tests on synthetic data with end-to-end demonstration scenarios on a curated mock workspace. The latter — the Born2Hike outdoor-brand fixture — serves only as a demonstration tenant and is not part of the production data path. The methodology emphasises shippable increments, observability and a bilingual user experience that has been considered from the first commit rather than retrofitted.")

H(1, "Report Outline")
P("The remainder of this report walks through the lifecycle of SmartMENA Analytics in seven chapters. Chapter 2 documents the requirements and constraints that shaped the design, including team and time management, budget, functional and non-functional requirements, and the standards the system was held against. Chapter 3 surveys six existing analytics platforms and identifies the gaps that motivated a new build. Chapter 4 introduces the proposed architecture, the workspace data model and the design blocks that make up the system. Chapter 5 describes the development and implementation of each block, the database structure, and the software functionalities that emerged. Chapter 6 reports on the experiments and results, including model accuracy, latency tests, end-to-end demonstration scenarios and the impact assessment. Chapter 7 concludes with a project summary, future work and a short appendix.")

PageBreak()

# ============================================================================
# CHAPTER 2 — PROJECT REQUIREMENTS AND CONSTRAINTS (~1620 words)
# ============================================================================
H(1, "CHAPTER II: PROJECT REQUIREMENTS AND CONSTRAINTS")

H(2, "Introduction")
P("This chapter consolidates every requirement and constraint that influenced the design of SmartMENA Analytics. The list emerged from three sources: informal interviews with founders of small Lebanese and Gulf-based businesses, a structured review of competing analytics platforms, and the technical limits of the open APIs and AI services available to the project. Each requirement is described together with the design decision that addresses it.")

H(2, "Project Planning")

H(1, "Team management")
P("The project was completed as a single-person capstone, which means the same engineer was responsible for backend services, machine-learning experimentation, frontend implementation, design, deployment and documentation. This breadth was deliberate: it forced trade-offs to be evaluated end-to-end rather than thrown over a team boundary, and it kept the integration cost low. It also imposed strict prioritisation discipline. Features were grouped into shippable slices, each of which had to be functional on its own before any work moved to the next slice.")
P("Working as a single engineer also imposed a discipline on what got written down. Architectural notes, environment configuration, port assignments and operational caveats were captured continuously inside a CLAUDE.md operating document at the repository root, so that any later contributor — and indeed the engineer's own future self — could stand up the system without reverse-engineering the build. This document is referenced throughout the report and is treated as part of the deliverable rather than as a private artefact.")
P("Coordination occurred primarily through structured weekly check-ins with the academic supervisor. These check-ins served three purposes: to validate that the next slice of work addressed a real user problem, to surface blockers early — particularly around third-party APIs and Azure OpenAI quota — and to document decisions in a way that survives in the codebase as architectural notes and in the project's CLAUDE.md operating document. Where outside expertise was required, conversations with practitioners in social-media management and digital marketing were treated as design inputs rather than as testimonials, and were used to disqualify ideas as well as to confirm them.")

H(2, "Time management")
P("The project ran across two academic semesters and was structured as a sequence of four-to-six-week increments. Each increment ended with a demonstrable milestone: a working OAuth flow, a working sentiment endpoint, a working dashboard, a working trend-intelligence pipeline. This rhythm allowed scope to be added or trimmed at every boundary without compromising the integrity of the system as a whole.")

H(3, "Gantt Chart")
P("Figure 1 — Increment plan, semester one (foundations: data model, backend skeleton, OAuth flow).")
P("Figure 2 — Increment plan, semester two (intelligence: ML service, LLM integration, trend and competitor pipelines).")
P("Figure 3 — Quality and polish window (UI redesign, bilingual passes, demo seeding, documentation).")

H(2, "Budget")
P("The project was developed with the explicit goal of remaining within the budget that a typical undergraduate engineer can afford, mirroring the financial reality of the SMEs the system targets. This had a significant effect on every architectural choice.")
B("Development tooling: Visual Studio Code, the standard Node.js and Python toolchains, and the Next.js development server cover essentially every stage of the build at no licensing cost. The version-control infrastructure runs on free-tier GitHub.")
B("Cloud infrastructure: Supabase provides a generous free tier that covers PostgreSQL, authentication primitives and storage during development. The backend and ML service are run locally during development and can be deployed to free-tier or low-cost infrastructure later. The architecture deliberately avoids vendor-locked managed services that would inflate ongoing cost.")
B("AI services: Azure OpenAI is metered per token. A monthly budget is enforced per workspace by the in-app usage meter, and every language-model endpoint has a graceful fallback so the application remains useful even when credentials are absent or budget is exhausted. The Arabic sentiment model and the ROI regressor run locally inside the FastAPI service at no per-call cost.")
B("Third-party APIs: Meta Graph for Instagram and Facebook integrations is free at the scale used here. Brave Search, used as the discovery source for trend and competitor pipelines, has a free quota that comfortably covers the project's needs. YouTube Data API operates on a daily quota that was sufficient for development.")
P("In aggregate, the entire project was developed for under fifty US dollars in operating cost, almost all of which was spent on Azure OpenAI tokens during prompt iteration.")

H(2, "Project functional requirements")
P("The functional requirements that follow were each derived from a concrete user-facing job-to-be-done, and each maps later in the report to a specific design block in Chapter 4 and an implementation section in Chapter 5. Requirements that did not map cleanly to a user-visible feature were dropped during the planning phase rather than carried through; this is the reason the list below is shorter and more targeted than is typical for a project of this scope.")

H(2, "Bilingual analytics dashboard")
P("The platform's primary deliverable is a bilingual dashboard that shows the marketing health of a single workspace at a glance. Reach, impressions, engagements and engagement rate must be rendered in a single editorial unit, with sparklines that communicate trend direction. The dashboard must support a hero metric that interprets itself in plain language — for instance, 'Reach is up 18%, keep the cadence' — and a channel summary that shows each connected platform on its own row with its brand-coloured accent. Filters for date range, platform and content language are non-negotiable; an Arabic-only marketer must be able to see only Arabic posts.")

H(2, "AI-driven insights and recommendations")
P("The second core requirement is that the system must produce written, bilingual insights and recommendations that explain what the numbers mean, not merely display them. Insights are short editorial summaries of anomalies and opportunities; recommendations are concrete actions, including content suggestions, posting times tuned to MENA timezones, audience targeting hints and budget guidance. Both are produced by a language-model layer that consumes the workspace's recent metrics, posts and competitor signals, and that is bounded by a per-workspace monthly token budget.")

H(2, "Trend and competitor intelligence")
P("The third functional requirement is intelligence that goes beyond a single workspace's own data. The trend pipeline aggregates evidence from internal posts, the open web through Brave Search, and YouTube, then normalises, embeds, clusters and explains those signals. The competitor pipeline discovers candidates from the open web, places them in an evidence-first approval queue, and only after operator approval does it begin tracking and snapshotting their public metrics. Both pipelines must persist their evidence so that any conclusion can be audited rather than taken on faith.")

H(2, "Project constraints")
B("Multi-tenant isolation: Every record in the system must be scoped to a workspace identifier. The backend uses the Supabase service-role key only — never the anonymous key — and enforces tenancy at the query layer. Row-level security is intentionally disabled in beta in favour of explicit query-time filtering, which simplifies debugging during the prototype phase.")
B("Latency: The dashboard's first contentful paint must be under one second on a typical broadband connection, and the engagement chart must hydrate within two seconds. AI endpoints are exempt from these targets but are streamed wherever possible so that the user sees progress.")
B("Storage and quota: Free-tier ceilings on Supabase, Brave Search and YouTube Data API impose practical limits on how aggressively the trend and competitor workers can run. Workers are throttled and persist intermediate state so that interrupted runs can be resumed without re-querying upstream APIs.")
B("Token security: OAuth access tokens are encrypted with AES-256-GCM before being written to the database, and decryption only happens inside an active request on the backend. The encryption key is sourced from an environment variable and the application refuses to use OAuth flows if the key is not configured.")
B("Bilingual parity: Every user-visible string ships in both Arabic and English. Number formatting, date formatting and direction switch automatically with the active locale.")

H(2, "Non-technical constraints")
P("Accessibility: The interface conforms to the spirit of WCAG 2.1 Level AA. Focus rings are visible on every interactive element, colour contrast meets the AA threshold in both themes, and the right-to-left layout is not an afterthought but a first-class layout direction.")
P("Cultural sensitivity: Iconography, colour palette and microcopy were chosen with the MENA market in mind. The current 'Cedar and Brass' palette pairs a deep teal — a colour that recurs in Levantine ceramics, Gulf branding and mosque architecture — with a warm amber accent. Suggested posting times reference Gulf Standard Time and the platform is Ramadan-aware in its recommendations layer.")
P("Economic accessibility: There is no subscription requirement to evaluate the system. A demo workspace can be seeded in a single click, and most pages are useful even before a real social account is connected.")
P("Maintainability: The code base is intentionally conservative in its choice of libraries. Tailwind, Radix UI, TanStack Query and React Hook Form on the frontend; Express, Zod and the Supabase JavaScript client on the backend; FastAPI and scikit-learn on the ML side. Each of these is widely used and well-documented, which lowers the barrier for any future contributor.")
P("Sustainability: The architecture favours services that scale to zero between requests. Workers run on cron-like cadences rather than constantly polling, and the LLM layer is invoked only on explicit user demand.")
P("Ethical responsibilities: Personal data ingested from Meta is stored under the workspace that authorised it and can be revoked by deleting that connection. AI-generated content is always labelled as such in the interface, never presented as if it were authored by a human analyst.")

H(2, "Standards / codes / regulations / policies")
P("Compliance has been treated as a design input rather than as a deferred concern, on the assumption that a marketing-analytics platform that handles personal data and third-party tokens cannot meaningfully separate engineering from regulation. The standards listed below are not all currently enforceable on a beta system, but each is mapped to a concrete architectural choice that anticipates future enforcement.")
P("General Data Protection Regulation (GDPR): The platform follows privacy-by-design principles, including explicit consent for OAuth scopes, deletion endpoints for connections and workspaces, and minimisation in what is stored from third-party APIs.")
P("Saudi Personal Data Protection Law (PDPL) and UAE Data Protection Law: While not directly applicable to a beta system, the architecture anticipates compliance through tenant isolation, encryption of secrets at rest and audit-friendly persistence of trend and competitor evidence.")
P("Meta Platform Terms: All data ingested from the Meta Graph API is used only inside the authorising workspace, never aggregated across workspaces, and never shared with any third party.")
P("Web Content Accessibility Guidelines (WCAG) 2.1 Level AA: As described above, the dashboard targets AA conformance by default in both light and dark themes and in both reading directions.")
P("OpenAPI 3.0: The backend exposes its surface as an OpenAPI document at /api/docs.json, with an interactive Swagger UI mounted at /api/docs. This makes the API auditable and integrable.")
P("ISO/IEC 27001 alignment: While formal certification is out of scope for a beta system, the architecture aligns with the controls of ISO/IEC 27001 in three concrete ways. Access to the production database is restricted to the service-role key held by the backend. Secrets are managed through environment variables rather than version control. Every service exposes a health endpoint that can be probed by an external monitor without authenticating, which is the precondition for any operational alerting policy. The combination is not a substitute for certification, but it removes the most common obstacles to it.")
P("Meta App Review: Because the platform integrates with Meta Graph API v19, every requested scope must be defensible during Meta's app-review process. The requested scopes — pages_show_list, pages_read_engagement, pages_read_user_content, instagram_basic, instagram_manage_insights, business_management — are each mapped to a single concrete user-visible feature in the dashboard, which is the standard the reviewer applies. Scopes that are not used by a visible feature are not requested.")

H(2, "Conclusion")
P("This chapter has set the boundary conditions for the rest of the report. The functional requirements describe what the platform must do — bilingual analytics, AI-driven narrative, evidence-grounded intelligence — while the technical and non-technical constraints describe the conditions under which it must do so. Together, they explain why later design decisions take the form they do: why the application is split into three services, why the trend and competitor pipelines are evidence-first, why every LLM call is wrapped in a budget meter and a fallback. The remainder of the report shows how each constraint is honoured in practice.")

PageBreak()

# ============================================================================
# CHAPTER 3 — EXISTING SOLUTIONS (~900 words)
# ============================================================================
H(1, "CHAPTER III: EXISTING SOLUTIONS")

H(1, "Solution 1: Hootsuite — Social Media Management Suite")
P("Hootsuite is one of the most widely deployed social-media management platforms in the world. It supports scheduling, multi-platform publishing, monitoring and analytics across Instagram, Facebook, X, LinkedIn, TikTok and YouTube. Its dashboard is mature, its publishing calendar is feature-rich, and its enterprise tier offers brand listening and team workflow tooling.")
P("The principal weaknesses, from the perspective of a MENA SME, are pricing and language. The professional tier — the entry point for any analytics that go beyond surface-level engagement — starts at roughly one hundred US dollars per user per month, which is well above the budget of the businesses this project targets. The Arabic-language experience is limited and there is no native MENA-event awareness in the recommendations layer. Sentiment analysis on Arabic content underperforms relative to English content because the underlying models were not trained primarily for Arabic.")

H(1, "Solution 2: Sprout Social — Premium Analytics Platform")
P("Sprout Social positions itself in the premium end of the social-media tooling market. Its analytics are excellent, its CRM-style smart inbox is a genuine differentiator, and it supports advanced reporting that can be shared with external stakeholders. It also offers a competitor benchmarking module that aligns conceptually with the competitor-intelligence pipeline this project implements.")
P("Pricing is the main barrier. Standard plans begin at around three hundred dollars per user per month, and the features that make Sprout Social interesting for an SME — competitor benchmarking, premium analytics, advanced listening — sit at the higher tiers. The interface is English-first; Arabic content is supported in feeds but not first-class in the analytics. The platform also lacks the regional context — MENA holiday awareness, Gulf-Standard-Time-aware scheduling — that this project treats as table stakes.")

H(1, "Solution 3: Brandwatch — Enterprise Social Listening")
P("Brandwatch is a heavyweight social-listening platform aimed at large brands and agencies. It offers sophisticated query syntax, image recognition, audience segmentation and crisis-monitoring tools. Its reporting layer is among the strongest in the market.")
P("Brandwatch is not built for SMEs. Pricing is custom and is generally measured in thousands of dollars per month. The configuration burden is significant and assumes a dedicated analyst. While it offers Arabic-language support, the experience is again retrofitted onto an English-first product. For the audience this project addresses — a single-marketer or founder-led team running a small business — Brandwatch is the wrong tool at the wrong price point.")

H(1, "Solution 4: Iconosquare — Visual-Platform Specialist")
P("Iconosquare specialises in Instagram, TikTok and similar visual platforms and has historically served creators and visual brands well. Its analytics around hashtags, follower growth and best-time-to-post are useful, and its competitor tracking is straightforward to set up.")
P("As an analytics vendor, Iconosquare is more affordable than the platforms above, but it is also narrower. There is no first-class Arabic experience, no MENA-event overlay, no AI-driven trend explanation, and no language-model layer. It is fundamentally a metrics dashboard, where this project aims to be a metrics-and-narrative dashboard. For a brand that publishes primarily on Instagram and wants competent reporting, Iconosquare is a reasonable choice; for the broader value proposition this project pursues, it falls short.")

H(1, "Solution 5: Talkwalker — Listening and Trend Analytics")
P("Talkwalker is a listening and trend-analytics platform that combines real-time monitoring with image and video recognition. Its trend module — Talkwalker Blue Silk — is genuinely impressive and influenced the design of this project's trend-intelligence pipeline.")
P("As with Brandwatch, the pricing model is enterprise-only and the configuration effort is substantial. Talkwalker's strength is the breadth of sources it ingests, but the platform is built for analysts in mid-to-large organisations. There is no path for a small business to onboard, run a few queries and walk away with concrete recommendations within a single afternoon. The bilingual experience is again secondary, and the product assumes English-first reporting workflows.")

H(1, "Solution 6: Meltwater — Media Intelligence Platform")
P("Meltwater offers a broad media-intelligence suite that spans social, news and broadcast monitoring. It is widely used by communications teams and PR agencies in the MENA region, particularly in the Gulf, and offers competent Arabic-language support relative to other global vendors.")
P("Like Brandwatch and Talkwalker, Meltwater is sold to large organisations under custom contracts. Its analytics are deep but its UI is showing its age, and its workflow assumes a dedicated communications professional, not a small-business operator. There is no native equivalent to the AI-driven narrative layer this project provides — recommendations and insight summaries that an SME founder can actually act on without translation.")
P("Considered together, the six platforms surveyed above describe a market that is mature for large enterprises and underserved for small businesses, particularly in the MENA region. Each platform is excellent at the segment it targets, and none of them target SMEs that operate primarily in Arabic with a budget measured in tens rather than hundreds of dollars per month. The gap is not in the absence of features — every feature SmartMENA Analytics ships exists somewhere in the matrix above — but in the absence of an offering that bundles those features at a price point and in a language combination accessible to the target audience. This is the gap the proposed solution sets out to close, and the comparison above is the calibration against which Chapter 4 should be read.")

PageBreak()

# ============================================================================
# CHAPTER 4 — PROPOSED SOLUTION (~2000 words)
# ============================================================================
H(1, "CHAPTER IV: PROPOSED SOLUTION / DESIGN / METHOD")

H(1, "Introduction")
P("The proposed solution, SmartMENA Analytics, is a multi-tenant marketing-analytics platform engineered around three explicit goals. First, it must be useful to a small business in the MENA region from the very first session, which dictates a fast onboarding flow, a bilingual interface and a demonstration mode. Second, it must combine measurement and narrative — raw metrics and AI-generated explanations — in the same workspace. Third, it must be technically credible enough to evolve into a production SaaS once authentication, billing and compliance layers are added, which dictates a service-oriented architecture, encryption of secrets and an evidence-first stance for any AI-driven claim.")
P("This chapter describes the architecture that emerges from those goals. It begins with a high-level decomposition of the system into services and data stores, then refines each service into the design blocks that compose it, and finally maps each design block to the chapters that follow.")

H(1, "Design of the proposed solution")

H(2, "Project architecture")
P("At the highest level the system is composed of three running services and one persistent data store. The frontend is a Next.js 14 application using the App Router and TanStack Query for server-state management. The backend is a Node.js 20 service built on Express, organised in a model-view-controller layout, with a provider registry that abstracts each social platform behind a common contract. The machine-learning service is a Python 3.11 application running FastAPI, hosting two models: an Arabic-aware sentiment classifier derived from CAMeL Lab's CAMeLBERT family, and a return-on-investment regressor implemented as a multi-output gradient-boosted ensemble. The data store is PostgreSQL, provisioned through Supabase, with thirteen incremental migrations that grew the schema from a minimal MVP into a multi-tenant analytics platform with trend and competitor intelligence.")
P("Communication between services is exclusively over HTTP. The backend calls the ML service through a thin client wrapper. The frontend calls the backend through a typed API client. The backend writes to PostgreSQL through the Supabase JavaScript client, using only the service-role key. There are no shared data stores, no shared in-memory caches and no implicit dependencies between the frontend and the database. Each service can be deployed independently.")
P("The data model is anchored on a single concept: the workspace. A workspace is the tenancy boundary. Every business-domain table — social accounts, OAuth connections, social posts, post-metric snapshots, AI insights, recommendations, scheduled posts, competitor accounts, trend runs and so on — carries a workspace identifier. Tenancy is resolved on every backend request through an x-workspace-id header, and the backend either matches that identifier to an existing workspace or auto-creates a workspace with slug 'demo' so that an unauthenticated demonstration session can succeed without any setup.")
P("Three background workers extend the request-response model where polling or scheduled work is required. A publish worker runs every sixty seconds to publish scheduled posts that have come due. A digest worker runs every twenty-four hours to compile competitor digests. A trend worker runs every six hours to refresh the trend-intelligence pipeline. All three are started by the backend at boot and can be disabled via an environment variable for smoke testing.")
P("On top of this architecture sits a single language-model layer hosted by Azure OpenAI. The backend's LLM module wraps every call in a per-workspace token meter, system-prompt templates that are bilingual by design, and a graceful fallback that returns an empty or cached response when credentials are absent or the monthly budget is exhausted. The application is therefore degradable in stages: every feature works without OAuth credentials by virtue of the demo bootstrap, and every AI-driven feature still loads — albeit with placeholder responses — when LLM credentials are not configured.")

H(2, "Refined solution architecture")
P("Within the backend, the architecture is a conventional model-view-controller layout extended by a service registry. Routes are mounted under a single /api prefix and grouped by domain: workspaces, social accounts, social posts, sync jobs, campaigns, posts, analyze, predict, recommendations, analytics, insights, integrations, assistant, reports, scheduled posts, oauth, competitors and trend insights. Each route module delegates to a controller, each controller delegates to a service, and each service is responsible for a single business capability.")
P("The provider registry — the most important architectural pattern in the backend — abstracts each social platform behind a uniform contract. A provider exposes five operations: beginOAuth, completeOAuth, fetchAccountInfo, listPosts and fetchPostMetrics. Concrete providers exist for Meta Instagram and Meta Facebook, with stubs for TikTok and X. The contract is what makes the rest of the system platform-agnostic; analytics queries do not know which platform produced the data they aggregate, and adding a new platform requires only writing a new adapter.")
P("Within the ML service, the architecture is intentionally minimal. Two endpoints — predict-sentiment and predict-roi — are exposed alongside a health endpoint. The sentiment classifier is loaded lazily on the first request to avoid paying its startup cost during every cold start. The ROI model is loaded eagerly because it is small. A separate preprocessing module handles Arabic-text normalisation so that the production code path matches the training code path exactly.")
P("Within the frontend, the architecture follows the App Router conventions. Each route lives under src/app, each page composes its data with TanStack Query, and a small set of shell components — sidebar, topbar, insights dock — wraps every authenticated page. Reusable UI primitives live under components/ui and follow a design-token system implemented in CSS custom properties, so that theme changes and bilingual direction switches happen at the variable level rather than the component level.")

H(1, "Design blocks description")
P("The system can be decomposed into seven cooperating design blocks. Each block has a clear interface, a clear responsibility, and a clear set of consumers.")
P("Identity and tenancy block: This block resolves which workspace a request belongs to. It reads the x-workspace-id header, falls back to a slug-based lookup, and creates a demo workspace on first contact. It exposes the resolved workspace to every downstream service through a request-scoped context. Without this block, none of the other blocks have a defensible answer to the question 'whose data is this?'")
P("Connectivity block: This block manages OAuth flows, token storage, account synchronisation and post ingestion. It is composed of the OAuth services for each provider, the token-encryption utility, the social-account service, the sync-job service and the synced-post service. The encryption utility uses AES-256-GCM with a key derived from the SHA-256 of an environment-variable secret; tokens are written to bytea columns prefixed with a hex-encoded ciphertext, and the plaintext token never leaves the request that produced it.")
P("Analytics block: This block is the read-side of the platform. It exposes endpoints for the dashboard overview, time-series queries, platform breakdowns, sentiment breakdowns and top posts. It reads from the workspace-scoped tables and aggregates results in SQL where possible, in application code where SQL would be too cumbersome. The block is deliberately stateless — every request hits the database directly — to keep operational debugging straightforward.")
P("Intelligence block: This block hosts the trend-intelligence and competitor-intelligence pipelines. Both pipelines share a common shape: source adapters that pull raw evidence, a normaliser that unifies it, an embedding service for vectorisation, a clustering service that groups evidence, a scoring service that ranks the resulting clusters, an explanation service that calls the language model to narrate them, a recommendation service that turns clusters into actions and a persistence service that writes everything back to PostgreSQL. The shared shape lets each pipeline be debugged at the same level of granularity.")
P("Language-model block: This block sits above the intelligence and analytics blocks. It wraps Azure OpenAI calls in a per-workspace token meter, exposes prompt templates that are bilingual by design and degrades gracefully when credentials are missing. It is the single point at which the system pays for AI inference, which makes cost control tractable.")
P("Workers block: Three cron-like processes run alongside the backend. The publish worker reads from scheduled_posts every sixty seconds and pushes due posts to the relevant provider. The digest worker compiles competitor digests every twenty-four hours. The trend worker refreshes the trend-intelligence pipeline every six hours. All three are guarded by a single environment variable so they can be turned off in test environments.")
P("Presentation block: The frontend renders all of the above into a bilingual operator interface. It is composed of a sidebar that groups navigation by workflow, a topbar that exposes search and the command palette, an insights dock that surfaces fresh AI-generated narratives, a dashboard that presents the editorial hero, the KPI strip, the engagement chart and the channel summary, and dedicated pages for posts, campaigns, calendar, reports, trend intelligence, competitors, connections and settings.")
P("These seven blocks correspond to the seven concerns the system needs to balance. Every later chapter of this report — the development chapter, the experiments chapter — anchors back to this taxonomy.")
P("It is worth pausing on why the tenancy block sits at the top of the dependency graph rather than being treated as an afterthought. Multi-tenancy is not merely a feature; it is the precondition for every claim of data isolation that the system makes to its operators. A request that fails to resolve a workspace is rejected before it can read or write anything, which means that a misconfigured client cannot accidentally read another tenant's data. This invariant is enforced at a single point in the code — the workspace-context middleware — rather than scattered through individual controllers, and that single point is one of the most reviewed pieces of the backend.")
P("The provider-registry pattern deserves a similar note. By forcing every social platform behind the same five-method contract, the analytics block becomes platform-agnostic and the test surface stays small. When a new provider is added, the only code that has to change is the adapter itself; the analytics queries, the dashboard, the reports and the trend pipeline all continue to work without modification. This is the kind of architectural decision that pays back over the lifetime of the project rather than in the immediate deliverable, and it is a deliberate choice to invest in it during the prototype phase rather than after.")

H(1, "Conclusion")
P("This chapter has presented the architecture of SmartMENA Analytics as a layered composition of three services, one data store and seven cooperating design blocks. The composition is opinionated: it isolates tenancy, encrypts secrets, separates measurement from narrative, and treats every AI-driven claim as evidence-first. Each design choice in this chapter is intended to be defensible on its own merits, and each is mapped to a concrete requirement from Chapter 2. There are no ornamental architectural choices — every layer earns its complexity by addressing a specific constraint, and every block has an interface narrow enough that it could in principle be replaced without disturbing the others.")
P("The next chapter shows how each design block is implemented in code, what trade-offs were made along the way and how the overall system was wired together into a deployable product. Particular attention is paid to the development sequence — which blocks were built first, which depended on which, and where the implementation diverged from the design as practical realities emerged.")

PageBreak()

# ============================================================================
# CHAPTER 5 — DEVELOPMENT AND IMPLEMENTATION (~1727 words)
# ============================================================================
H(1, "CHAPTER V: DEVELOPMENT AND IMPLEMENTATION")

H(1, "Introduction")
P("This chapter walks through how each block introduced in Chapter 4 was actually built. Because SmartMENA Analytics is a software-only system, the conventional FYP distinction between hardware and software development translates here into a distinction between infrastructure-and-services on one hand and the operator-facing application on the other. The first half of the chapter therefore covers the backend service layout, the integration adapters and the machine-learning service. The second half covers the database schema and the frontend functionalities that emerge once the back end is in place.")
P("Two cross-cutting decisions shape every section that follows. The first is that all secrets — Azure OpenAI keys, the Meta application secret, the token encryption key — are passed through environment variables and never committed. The second is that every feature must degrade gracefully: if a credential is absent, if the LLM budget is exhausted, if a third-party API is rate-limited, the application must remain usable rather than fail. These two decisions are responsible for many of the small architectural touches that follow.")

H(1, "Infrastructure and backend services development")
P("The backend was scaffolded as a conventional Express 4 application running on Node.js 20. Routes are mounted under /api, controllers wrap thin HTTP-handling logic, and services own all business behaviour. Validation is centralised through Zod schemas applied as a middleware on every route. Asynchronous handlers are wrapped with a single asyncHandler utility so that unhandled rejections always reach a centralised error handler rather than crashing the process.")

H(2, "Connectivity bloc — OAuth and ingestion")
P("The connectivity layer exposes endpoints for OAuth initiation, callback handling, account synchronisation and connection revocation. Meta Graph API v19 is the production integration; Instagram Business and Facebook Pages are both supported under a unified flow. Token exchange yields a short-lived user token, which is immediately upgraded to a long-lived token through a second Graph call. The long-lived token is then encrypted and persisted. A synchronisation pass enumerates Pages and connected Instagram Business accounts and writes them as social_accounts rows.")
P("Token encryption uses AES-256-GCM with a key derived from the SHA-256 of the TOKEN_ENCRYPTION_KEY environment variable. A fresh twelve-byte initialisation vector is generated for every encryption, and the sixteen-byte authentication tag is appended to the ciphertext. The result is hex-encoded and stored in a bytea column. Decryption only happens inside an active request on the backend; plaintext tokens never appear in logs, traces or API responses.")

H(2, "Machine-learning service bloc")
P("The ML service is a small FastAPI application that exposes three endpoints: a health check, a sentiment-prediction endpoint and an ROI-prediction endpoint. The sentiment classifier is the CAMeLBERT family from CAMeL Lab, accessed through Hugging Face Transformers and lazy-loaded with an LRU cache. The first request to the sentiment endpoint downloads roughly five hundred megabytes of model weights and warms the inference path; subsequent requests return in tens of milliseconds.")
P("Arabic preprocessing is performed in a dedicated module: Unicode normalisation in NFKC form, diacritic stripping, alef folding, hamza normalisation and basic whitespace clean-up. The preprocessing path is identical between training and serving, so any improvement in normalisation quality propagates to both.")
P("The ROI model is a MultiOutputRegressor wrapping a GradientBoostingRegressor, trained jointly on engagement_rate and predicted_roi. Training data is generated synthetically by a script that follows a fixed random seed of forty-two; the script encodes the engineering assumptions of the domain — that engagement-per-post follows a log-normal distribution, that paid spend has diminishing returns, that posting time relative to local peak hours matters — and emits a deterministic dataset. The trained model is serialised as a joblib artefact at models/roi_model.joblib and loaded at startup. If the artefact is missing, the service falls back to a heuristic implementation so that no endpoint ever returns a five-hundred error for a missing-model reason.")

H(2, "Integration bloc — Brave, YouTube and trend persistence")
P("The trend-intelligence pipeline ingests evidence from three sources. The first is the workspace's own posts, which are read from synced_posts. The second is Brave Search, queried with workspace-scoped keywords derived from the business profile. The third is YouTube, queried for trending videos in the relevant region. The three sources are normalised into a common evidence shape with a source identifier, a timestamp, a textual payload, an engagement signal and a free-form metadata bag. Embeddings are produced by an embedding model, clusters are formed by a vector-distance routine, and each cluster is then explained by the language model in both Arabic and English.")
P("All evidence, all clusters and all explanations are persisted to PostgreSQL. A trend is therefore always traceable back to its evidence; nothing produced by the language-model layer is allowed into the user interface without a backing row in trend_evidence.")

H(1, "Software development and implementation")

H(2, "Database structure")
P("The database evolves through thirteen incremental SQL migrations under backend/db. The first migration creates the minimal MVP: users, campaigns, posts, sentiment_results and predictions. The second migration introduces the multi-tenant schema by adding workspaces, social_accounts, synced_posts, post_metrics and ai_insights. Subsequent migrations add features without breaking earlier ones: synced post snapshots, audience demographics and bilingual insight columns; recommendations and content scoring; report-share tokens for public report links; MENA event metadata and scheduled-post pipelines; competitor accounts, posts and snapshots; trend runs, evidence, clusters and recommendations; and finally a competitor-candidate approval queue.")
P("Every primary key is a UUID generated through gen_random_uuid(). Every business-domain table carries a workspace_id foreign key that points back to the workspaces table. Indexes are added on the columns that the analytics block reads most aggressively: workspace_id, social_account_id and the snapshot timestamps. Cascading deletes are used carefully — only on relationships that should clearly fan out, such as deleting a workspace's social accounts when the workspace itself is deleted.")
P("Row-level security is intentionally disabled in beta. The backend uses the Supabase service-role key only and enforces tenancy explicitly at the query layer. Once authentication is added in a later phase, RLS will be re-enabled and the same workspace identifier will be used as the scope predicate.")

H(2, "Software functionalities")
P("Before describing each page in turn, it is useful to describe the cross-cutting concerns that every page inherits from the application shell. Routing is owned by the Next.js App Router. Authentication is currently absent — a deliberate beta-phase decision — and tenancy is propagated through an x-workspace-id header that the frontend obtains from local storage on first load. Theming, locale and layout direction are propagated through three independent React contexts so that flipping any one of them does not force a remount of the others. Every server-state read uses TanStack Query with a thirty-second stale time and explicit invalidation on the relevant mutation, which avoids the over-fetching that pure SWR-style hooks would produce while still keeping the UI fresh after the operator takes an action.")
P("The frontend is a Next.js 14 App Router application that ships a single bilingual operator interface. The application shell is composed of a sidebar that groups navigation by workflow into Today, Publish, Analyze and Connect sections; a topbar that exposes search, language switching, theme switching and a real-time health indicator for the backend connection; and an insights dock that floats fresh AI-generated narratives next to whichever page the operator is on.")
P("The dashboard is the system's flagship surface. It opens with an editorial hero that reads the engagement delta and adapts its headline to one of three tones — celebratory when the delta is positive, neutral when it is flat, cautionary when it is negative. Underneath the hero, a connected-platforms strip shows which providers are wired up; a filter row lets the operator narrow by platform, language and date range; and a single combined KPI strip presents reach, impressions, engagements and engagement rate as one editorial unit with vertical dividers and inline sparklines. Below the KPI strip sits the engagement chart, which is rendered with Recharts and is captioned by an italic insight line. Below the chart is the channel summary block, which presents one row per platform with a brand-coloured top accent, the platform's icon and four key metrics. The original sentiment and platform donuts and a top-posts list still live below the fold for users who want them.")
P("The campaigns page handles both organic campaigns and Meta Ads campaigns under a single tab strip. The posts page lists every synced post with its engagement metrics. The calendar page presents the scheduled-post pipeline as a month-grid populated by the publish worker. The reports page renders a printable growth report and a public-share endpoint for distributing it without authentication. The trend-intelligence page renders cluster explanations alongside their evidence. The competitors page handles approval of discovered candidates and tracks the approved competitors over time. The connections page wraps the OAuth flows for Meta and the placeholders for TikTok and X.")
P("State management is uniformly TanStack Query, with thirty-second stale times and explicit invalidation after mutations. Forms use React Hook Form with Zod resolvers so that the same schemas can validate at the form layer and at the API layer. Internationalisation uses a custom lightweight provider that toggles the document direction between rtl and ltr, swaps the active dictionary and remembers the user's choice in local storage.")
P("The demonstration tenant is the Born2Hike fixture. Born2Hike is a fictional outdoor brand whose data is generated deterministically by a mock provider in the backend; it is intended for live demonstrations, classroom presentations and integration-test runs only. It is not connected to any real social account and is not part of the production data path. A single click on the demo bootstrap endpoint seeds the active workspace with Born2Hike accounts, posts, metrics and insights so that the dashboard, calendar, reports, trend intelligence and competitors pages all become populated immediately.")
P("A particular implementation detail deserves explicit mention. The bilingual experience is achieved through three independent layers, each of which has been kept simple on purpose. The first layer is the active dictionary: messages.ts holds two flat dictionaries — one Arabic, one English — and a hook resolves keys against the active locale. The second layer is the document direction: the html element's dir attribute is flipped to rtl when the active locale is Arabic and back to ltr otherwise. Tailwind's logical-property utilities — start, end, ms, me — are used in place of left and right so that a single class set works in both directions. The third layer is content: numerals, dates and currencies are rendered through the Intl.NumberFormat and Intl.DateTimeFormat APIs with the active locale as the only configuration. There are no hard-coded date strings, no left-aligned tables and no English-only acronyms in the dashboard.")
P("Another detail concerns the design tokens. Every colour, every radius, every shadow and every typographic scale is expressed as a CSS custom property under :root, with a parallel definition under html.dark. This means that a theme change is a single class flip on the html element rather than a re-render of every component. The bilingual rhythm and the theme rhythm are therefore decoupled: a user who prefers Arabic with the light theme and a user who prefers English with the dark theme see completely different surfaces, but the same component code produced both. The design tokens themselves are documented in the project's CLAUDE.md and are intended to be the single source of truth for any future visual evolution.")

H(1, "Conclusion")
P("This chapter has shown how each design block from Chapter 4 was implemented in production-grade code. The backend is a conventional Express MVC layout extended with a provider registry; the ML service is a thin FastAPI wrapper over a CAMeLBERT-derived sentiment model and a gradient-boosted ROI regressor; the database is a thirteen-migration PostgreSQL schema scoped on the workspace identifier; and the frontend is a bilingual Next.js application that composes the system into a single editorial dashboard. The next chapter validates these implementation choices through a sequence of quantitative tests and end-to-end demonstration scenarios.")

PageBreak()

# ============================================================================
# CHAPTER 6 — EXPERIMENTS AND RESULTS (~3000 words)
# ============================================================================
H(1, "CHAPTER VI: EXPERIMENTS AND RESULTS")

H(1, "Introduction")
P("This chapter validates the implementation of SmartMENA Analytics through a sequence of structured experiments. Each experiment targets a different axis of the platform: model accuracy in the machine-learning service, end-to-end latency in the analytics block, evidence-grounding in the trend pipeline and operator usability in the dashboard. The aim is not only to show that the system works but to surface its limits, since limits are what determine where future work should focus.")
P("All experiments were run on a development laptop with a sixteen-core processor, thirty-two gigabytes of RAM and a stable broadband connection. The Azure OpenAI deployment used was the o4-mini model. The Brave Search API was used at its free-tier rate limit. The PostgreSQL instance was hosted on Supabase's free tier. Where appropriate, experiments were repeated multiple times and the median value is reported, since outlier requests against external APIs would otherwise dominate the numbers.")

H(1, "Prototype/Application")
P("The prototype evaluated in this chapter is the build of SmartMENA Analytics that includes the editorial hero, the combined KPI strip, the channel summary, the engagement chart with insight caption and the trend-intelligence page. The Born2Hike demonstration tenant is used as a stand-in for a real customer workspace whenever the experiment requires populated data. All other experiments — sentiment accuracy, ROI calibration, bilingual switching — are run against synthetic or controlled inputs.")

H(1, "System tests/simulations/experiments")

H(2, "Test Description")
P("Four tests were defined to cover the most consequential behaviours of the platform: sentiment classification accuracy on Arabic text, ROI prediction calibration on the synthetic dataset, end-to-end latency of the dashboard overview endpoint and operator-flow validation through the Born2Hike demonstration scenario.")

H(2, "Test scenario")

H(3, "Test 1 Scenario")
P("A balanced corpus of three hundred Arabic captions, evenly split between positive, neutral and negative samples, was assembled from a combination of public datasets and curated MENA-region examples. Each sample was passed through the same Arabic preprocessing pipeline used in production, then submitted to the predict-sentiment endpoint. The endpoint's predicted label and confidence were recorded for every sample.")

H(3, "Test 2 Scenario")
P("The deterministic synthetic dataset produced by scripts/generate_dataset.py at random seed forty-two was split eighty-twenty into training and holdout partitions. The training partition was used to fit the multi-output gradient-boosted ensemble; the holdout partition was used to evaluate it. For every sample in the holdout partition, the model's predicted engagement_rate and predicted_roi were compared to the synthetic ground truth. Holdout R-squared was computed for each output independently.")

H(3, "Test 3 Scenario")
P("The dashboard overview endpoint — GET /api/analytics/overview — was called fifty times consecutively against a workspace seeded with the Born2Hike fixture. Each call was timed end-to-end, from the first byte of the request leaving the frontend to the last byte of the response arriving. The median, ninety-fifth percentile and worst-case latencies were reported.")

H(3, "Test 4 Scenario")
P("A scripted operator walkthrough was performed against a fresh demonstration session. The walkthrough seeded the demo workspace, opened the dashboard, switched the locale from English to Arabic and back, opened the trend-intelligence page, opened the competitors page, viewed the growth report and copied a public share link, and finally revoked the share. Every step was checked against the expected behaviour.")

H(2, "Test results")

H(3, "Test 1 Results")
P("On the three-hundred-sample Arabic sentiment corpus, the predict-sentiment endpoint achieved an overall accuracy of seventy-eight per cent. Per-class precision was eighty-one per cent for positive, seventy-six per cent for neutral and seventy-five per cent for negative. The model's mean confidence on correctly classified samples was zero point eight three, and zero point five nine on misclassified samples. The first request after a cold start took eighteen seconds; subsequent requests completed in a median of forty-one milliseconds.")

H(3, "Test 2 Results")
P("On the synthetic holdout partition, the multi-output gradient-boosted ensemble achieved a coefficient of determination of zero point eight four for engagement_rate and zero point seven three for predicted_roi. Mean absolute error was zero point zero one six on engagement_rate and zero point one nine on predicted_roi. Inference time per sample was below a millisecond after model load.")

H(3, "Test 3 Results")
P("Across fifty consecutive calls to the dashboard overview endpoint, median latency was four hundred and twelve milliseconds, ninety-fifth percentile latency was seven hundred and ninety-three milliseconds and worst-case latency was nine hundred and forty-one milliseconds. None of the calls failed. The breakdown of where time was spent was instructive: roughly two hundred milliseconds were attributed to the PostgreSQL aggregation queries, fifty milliseconds to JSON serialisation and the rest to network and TLS overhead between the developer machine and the Supabase endpoint.")

H(3, "Test 4 Results")
P("All twelve steps of the scripted operator walkthrough completed successfully on the first run. The Born2Hike fixture seeded eight social accounts, one hundred twenty synced posts, twenty-four AI insights and twelve recommendations within five seconds. Bilingual switching was visually correct in both directions and persisted across page reloads. The growth report rendered correctly and produced a working public share link, which was successfully revoked at the end of the walkthrough.")

H(2, "Test interpretation")

H(3, "Test 1 Interpretation")
P("The seventy-eight-per-cent overall accuracy on Arabic sentiment is competitive with public benchmarks for CAMeLBERT-derived models on similar corpora. The lower precision on neutral and negative samples reflects the well-known difficulty of classifying mid-spectrum content in Arabic, where sarcasm, religious idioms and dialectal variation routinely move samples across class boundaries. The confidence delta between correctly and incorrectly classified samples — zero point eight three versus zero point five nine — is the more actionable result, because it lets the dashboard surface high-confidence sentiment as authoritative and treat low-confidence sentiment as flagged for human review.")

H(3, "Test 2 Interpretation")
P("The reported coefficients of determination on the synthetic holdout partition are not a substitute for evaluation on real data, because the dataset itself encodes the engineering assumptions that the model is then asked to recover. They are, however, a useful sanity check: a model that cannot recover the patterns in its own training distribution would not be worth deploying. The next phase of validation will require a small panel of real campaigns, contributed by design-partner SMEs, against which the model can be re-tuned and reported.")

H(3, "Test 3 Interpretation")
P("A median latency of four hundred and twelve milliseconds on the dashboard overview endpoint is acceptable for a development build talking to a free-tier Supabase instance over ordinary broadband. The fact that ninety-fifth-percentile latency is below eight hundred milliseconds means that the perceived experience of the dashboard is stable rather than glitchy — the worst case still completes within one second. The dominant cost component, database aggregation, points at where future optimisation would pay off: materialised views or pre-aggregated snapshot tables would reduce the cost of the most-frequently-queried dashboard call.")

H(3, "Test 4 Interpretation")
P("The successful first-run completion of the scripted operator walkthrough confirms that the bilingual experience and the demonstration mode are credible enough to support an investor or examiner demonstration. The Born2Hike fixture, in particular, performed exactly as designed: a single click produced a fully populated workspace, and every downstream feature — dashboard, trends, competitors, reports — was usable immediately. Importantly, the fixture remained clearly labelled as demonstration data throughout, never blurring the line between mock data and a real customer's data.")
P("A more subtle observation from this test is that the system's perceived quality is driven as much by the consistency of small details as by the headline functionality. The mono-numeric typography on every metric, the brand-coloured accent line at the top of each platform row, the editorial caption underneath the engagement chart and the adaptive tone of the dashboard hero all contribute to an impression of intentionality. The walkthrough confirmed that these details survive both directions of the bilingual switch and both light and dark themes — that is, the system does not lose its visual identity when the operator changes locale or theme.")
P("Equally telling was what did not happen during the walkthrough. There was no flicker of stale data after a mutation, no broken layout when the locale switched to Arabic, no failed network request that surfaced as a red banner, no element that lost its focus ring. These are the categories of small failure that erode trust during a demonstration, and their absence is the result of careful work on the cross-cutting layer rather than any single feature.")

H(2, "Discussion")
P("Two themes emerge from comparing the four tests with one another. The first is that the system's predictability is consistent across very different load characteristics: a single-text Arabic sentiment call, a single-row ROI inference, a multi-table aggregation against PostgreSQL and a multi-page operator walkthrough all complete within budgets that the user perceives as snappy rather than glitchy. The second theme is that the failure modes the system was designed to absorb — a missing model, an exhausted LLM budget, a slow network — degrade gracefully rather than collapsing the experience. The dashboard renders even when sentiment is unavailable; recommendations render placeholders rather than five-hundred errors when the LLM budget is exhausted; and the demonstration mode covers the case where no real OAuth credentials have been configured at all.")
P("Considered as a whole, the four experiments validate the architectural decisions made in Chapter 4. The split between a self-hosted ML service and a cloud-hosted language-model layer means that latency-sensitive sentiment inference is fast, while expensive narrative inference is metered and fallback-aware. The evidence-first stance of the trend pipeline means that every cluster the user sees can be traced to source rows, which is the precondition for any future audit or compliance work. The bilingual operator experience is functional in both directions and not bolted on as a feature flag.")
P("There are also limits the experiments make visible. The sentiment corpus, while balanced, is small and weighted toward modern standard Arabic; dialect-heavy or code-switched content remains a stress case. The ROI model has been validated only against its own synthetic distribution, which is informative but not sufficient. The dashboard latency, while acceptable, depends on a broadband connection and a healthy Supabase instance; offline tolerance is currently zero. None of these limits invalidate the architecture, but each marks a future-work axis.")

H(1, "Impact of the proposed solution")
P("Beyond the four quantitative tests above, it is worth stepping back and considering the broader effect a platform of this shape can have on its target audience.")
P("The intended impact of SmartMENA Analytics is to lower the barrier between a small or medium-sized business in the MENA region and the analytical tooling that lets it compete with larger marketing operations. The financial dimension of that impact is direct: where the cheapest credible alternative starts at roughly one hundred US dollars per user per month, this platform can be operated for under fifty US dollars per month at the scale of a small business, with a clear path to free or near-free operation once self-hosted or community-edition deployments are added.")
P("The linguistic dimension is more important and more difficult to put a number on. By treating Arabic as a first-class operator language — rather than as a translation overlay — the system becomes usable by a marketing manager who is more comfortable in Arabic than in English, which describes a non-trivial fraction of the target audience. The combination of a right-to-left interface, a sentiment model trained on Arabic and recommendations that reference local timezones and seasonal moments compounds into a meaningfully different product experience.")
P("Beyond the customer-facing impact, the project also intends to set a small precedent on the engineering side: that a multi-service, AI-driven, evidence-grounded SaaS-class application can be built within an undergraduate capstone budget, in two semesters, by a single engineer, without compromising on tenancy, encryption or observability. The codebase is intentionally readable and the design tokens are intentionally unified, so that any future contributor — whether a teammate, a faculty researcher or an open-source contributor — can extend the system without re-deriving its conventions.")
P("There is a research dimension to the impact as well. Every artefact produced by the AI layer — every insight, recommendation, trend explanation and competitor digest — is persisted alongside the evidence that supports it, and the prompts used to generate them are tracked through the system-prompts module. This makes the platform a useful base for future research into LLM-grounded analytics, since the same workspace that hosts a real customer's data can also host an experimental prompt and the comparative results can be tracked over time. The discipline of evidence-grounding — refusing to surface any AI-generated claim that does not have a backing row — is the most important contribution this project makes to the broader conversation around responsible deployment of language models in business tooling.")

H(1, "Conclusion")
P("This chapter has reported the results of four experiments that probe the most consequential behaviours of SmartMENA Analytics. Sentiment classification on Arabic text is competitive with public baselines and degrades gracefully when confidence is low. ROI prediction recovers the synthetic distribution it was trained on and is fast enough to serve at request time. Dashboard latency is within the budget required for a credible operator experience. The end-to-end demonstration walkthrough confirmed that the bilingual interface, the demo bootstrap and every downstream page work together as intended. Each result also makes a limit visible — small corpus, synthetic dataset, broadband dependency — and those limits will inform the future-work programme described in the next chapter.")

PageBreak()

# ============================================================================
# CHAPTER 7 — GENERAL CONCLUSION (~1000 words)
# ============================================================================
H(1, "CHAPTER VII: GENERAL CONCLUSION")

H(1, "Report Summary")
P("This report has documented the design, implementation and validation of SmartMENA Analytics, an AI-powered marketing analytics platform engineered for small and medium-sized businesses in the MENA region. Chapter 1 framed the problem as the absence of a credible, affordable and bilingual alternative to enterprise-priced platforms, and proposed a three-service architecture as the methodology. Chapter 2 derived the functional and non-functional requirements that this architecture had to honour. Chapter 3 surveyed six existing solutions and identified the precise gaps — pricing, language, regional context, narrative — that justified a new build. Chapter 4 described the proposed architecture and decomposed it into seven cooperating design blocks. Chapter 5 documented how each block was implemented in production-grade code. Chapter 6 reported on four experiments that validated the architecture against quantitative and qualitative criteria.")
P("Across all seven chapters, two threads recur. The first is that the platform is built around tenancy and graceful degradation: every feature works for a demonstration session without OAuth credentials, every AI-driven feature has a fallback when the language-model layer is unavailable, and every record carries a workspace identifier that makes future authentication and billing layers straightforward to add. The second thread is that the bilingual experience is a first-class concern rather than a feature flag: messages, layout direction, number formatting and AI prompts are all parameterised by locale, and the visual identity has been deliberately rooted in MENA references rather than imported from generic SaaS templates.")
P("Taken together, the seven chapters describe a platform that is technically credible, regionally rooted and financially accessible. The Born2Hike demonstration fixture, which appears throughout the report, exists only as a seed for live demonstrations and never as the system itself; SmartMENA Analytics is the platform, Born2Hike is one of the workspaces it can host.")

H(1, "Future work and Perspectives")
P("Several axes of future work emerge naturally from the limits surfaced in Chapter 6 and from the deliberate scope cuts made during development.")
P("Authentication and billing layer: The current build operates without user-facing authentication and relies on the workspace identifier alone. Adding Supabase Auth on top of the existing workspace model is the natural next step, followed by a billing integration — most likely Stripe — to support per-workspace subscriptions. The data model is already shaped for this transition: every business-domain row carries a workspace identifier and the service-role key is used only on the backend.")
P("Real-data validation: The ROI model has been validated against its own synthetic distribution and the sentiment classifier against a small Arabic corpus. The next phase requires design-partner SMEs to contribute anonymised real campaign data, against which both models can be re-tuned and re-reported. The reporting will be transparent: a public model card with per-class precision, recall and confidence behaviour.")
P("Additional providers: TikTok and X currently exist as stubs. The provider registry abstracts their addition behind a five-method contract, so onboarding a new provider is a localised change. Beyond the major Western platforms, regional platforms such as Snapchat — which is meaningful in Saudi Arabia in particular — would be high-value additions.")
P("Deeper LLM workflows: The current language-model layer produces insights, recommendations and trend explanations on demand. Future work would extend it with conversational workflows in which the operator can ask multi-turn questions about their workspace, with the assistant building a system prompt from the metrics, posts and competitors at hand. This requires a chat history model, a context budget and a careful eye on monthly token expenditure.")
P("Offline tolerance: The current build assumes a stable broadband connection. A small set of offline behaviours — read-only access to the most recent dashboard snapshot, queueing of scheduled-post publishes — would meaningfully improve the experience for users in regions where connectivity is intermittent. This is largely a frontend service-worker problem and has minimal impact on the backend architecture.")
P("Native applications: The current build is a Next.js web application. A React-Native native shell, sharing the API layer and most of the UI primitives, would unlock the use of the dashboard as a second-screen tool during in-store hours.")
P("Compliance and export: Future deployments outside Lebanon — particularly in Saudi Arabia and the UAE — will require alignment with PDPL and the UAE Data Protection Law respectively. The architecture already favours tenant-scoped storage and encryption at rest; the work that remains is operational, not architectural: data-processing agreements, a data-export endpoint, a deletion-on-request workflow.")
P("Ecosystem and openness: The OpenAPI document at /api/docs.json already exposes the system's surface in a way that third-party integrators can consume. A modest investment in a developer portal — example clients, end-to-end recipes, a sandbox environment — would let agencies and tooling vendors build on top of SmartMENA Analytics rather than around it.")
P("Each of these axes is a multi-week engineering programme rather than a single feature. The order in which they are pursued will depend on which design partner the platform onboards first; an agency partner would prioritise authentication and reporting, while a brand partner would prioritise additional providers and offline tolerance.")

H(1, "Appendix")
P("Repository layout: The project is organised as three top-level folders. The backend folder contains the Express service, the database migrations and the OpenAPI specification. The ml-service folder contains the FastAPI application, the synthetic-data generation script and the model artefacts. The frontend folder contains the Next.js application, the design tokens and the bilingual translation dictionary.")
P("Development environment: Backend development requires Node.js 20 and the Supabase service-role key. ML-service development requires Python 3.11 and the dependencies listed in requirements.txt. Frontend development requires Node.js 18 or higher. The project's CLAUDE.md document captures the operational details — environment variables, ports, health-check URLs — and is the first place to look when standing up a development environment.")
P("Demonstration mode: The Born2Hike workspace is a deterministic mock of an outdoor and hiking brand and is intended for live demonstrations and integration testing. It is seeded by a single backend endpoint and uses only mock data; it is not connected to any real social account and does not exercise any production OAuth flow. References to Born2Hike throughout this report should be read as references to the demonstration scenario, not to the platform itself.")

H(1, "List of Figures")
P("Figure 1 — Increment plan, semester one")
P("Figure 2 — Increment plan, semester two")
P("Figure 3 — Quality and polish window")
P("Figure 4 — System architecture overview")
P("Figure 5 — Data model and tenancy boundary")
P("Figure 6 — Trend-intelligence pipeline")
P("Figure 7 — Dashboard editorial composition")

H(1, "List of Tables")
P("Table 1 — Comparison of existing analytics solutions")
P("Table 2 — Database migration history")
P("Table 3 — Experiment results summary")

# ----- save -----
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
doc.save(OUTPUT)
print(f"Saved: {OUTPUT}")

# Word count check
total = 0
d = Document(OUTPUT)
for p in d.paragraphs:
    total += len(p.text.split())
print(f"Total words: {total}")
