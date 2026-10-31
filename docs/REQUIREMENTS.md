# Bible Quiz Web App — Requirements Document

| | |
|---|---|
| **Version** | 0.3 (Draft) — owner decisions applied; Westminster Shorter Catechism chosen as the first content |
| **Date** | 2026-10-30 |
| **Owner** | Kamal |
| **Status** | Most decisions made; a few items still open (see §12) |

### Change log
| Version | Change |
|---|---|
| 0.1 | First draft. |
| 0.2 | Verses are shown first, then a 60-second thinking timer runs, then the answer options appear. "I'm ready" skip added. |
| 0.3 | Translation: WEB. Scoring: every correct option must be chosen. Participants enter their name. Single admin. Published quizzes are frozen. All questions must be verse-based (no trivia), with multiple-answer questions preferred. First content: Westminster Shorter Catechism, imported by the developer. |

---

## 1. Purpose

Build a web application that hosts Bible quizzes made of multiple-choice questions. **Every question comes from Scripture.** The participant first reads the question together with the Bible verses it is based on, takes time to think, and only then sees the answer options. This makes the quiz a way to meditate on Scripture, not a trivia game.

The site owner (the only admin) maintains a central **question bank** and puts questions together into **quizzes**. Each quiz gets a **permanent, shareable link** that anyone can open to take the quiz or read through it.

The first content is the **Westminster Shorter Catechism** (§10), with its proof texts shown in the **World English Bible (WEB)**.

## 2. Goals and Non-Goals

### 2.1 Goals
- G1. Let anyone with a link take a Bible quiz on a phone or a computer, with no sign-up (they only enter their name).
- G2. Ground every question in one or more Bible verses, and show those verses before the answers.
- G3. Give the participant time to think on the verses before choosing.
- G4. Give the owner a secure admin page to manage questions and quizzes.
- G5. Support many quizzes, each with a permanent URL whose content never changes after publishing.

### 2.2 Non-Goals (Version 1)
- Participant accounts, passwords, leaderboards, or a participant-facing score history.
- More than one admin, or admin roles and permissions.
- Competitive live quizzes (Kahoot-style). The only timer in v1 is the thinking timer in FR-3.
- Question types other than multiple choice (e.g. fill-in-the-blank, matching).
- Trivia questions (see FR-0).
- Translations other than WEB, and languages other than English.
- Native mobile apps (the web app will be mobile-responsive instead).

## 3. User Roles

| Role | Description | Authentication |
|---|---|---|
| **Participant** | Anyone who opens a quiz link. Enters their name, then takes the quiz, or reads it in study mode. | None (name only) |
| **Admin** | The site owner (Kamal) only. Manages the question bank and quizzes. | Required (email + password) |

There is exactly **one admin account**. It is created during setup (from environment settings or a setup command). There is no sign-up page and no page for adding other admins.

## 4. Core Concepts

- **Question bank**: the master list of all questions. A question can be reused in many quizzes.
- **Question**: a prompt, its verse references (one or more), two or more answer options, one or more correct options, and an explanation.
- **Verse reference**: a Bible reference (book, chapter, verse or verse range), e.g. *Genesis 1:27* or *Psalm 73:25–28*. A question can have **many** references.
- **Answer option**: one choice the participant can pick. The admin marks each option as correct or incorrect.
- **Quiz**: a named, ordered set of questions taken from the bank, with its own permanent link. When it is published, its content is **frozen** (FR-5).
- **Attempt**: one participant's run through a quiz, recorded with the name they entered.

## 5. Functional Requirements

### FR-0 Content Rules (applies to every question)

| ID | Requirement |
|---|---|
| FR-0.1 | **Every question must be based on Scripture.** The correct answer must be stated in, or directly taught by, the verses attached to the question. |
| FR-0.2 | **No trivia.** Questions about incidental details (counting, names in genealogies, "how many cubits", "who was the 5th king") are not allowed. Questions should be about God, man, sin, salvation, and Christian faith and life, as the verses teach them. |
| FR-0.3 | **Prefer multiple-answer questions.** Scripture often teaches several truths at once, so a question should have several correct options wherever the verses support it. Use a single answer only when there really is one answer. |
| FR-0.4 | Wrong options should be plausible statements that the attached verses clearly contradict or do not teach. No trick wording, and no "All of the above" or "None of the above". |
| FR-0.5 | Every question should have an explanation that ties the correct options back to the verses. For catechism questions, this is the full catechism answer. |
| FR-0.6 | The admin form enforces FR-0.1 by requiring at least one valid verse reference. FR-0.2 to FR-0.4 are editorial rules, and the admin checks them when reviewing a question. |

### FR-1 Question Types

| ID | Requirement |
|---|---|
| FR-1.1 | A question is **single-answer** when exactly one option is marked correct. It shows as **radio buttons**, and the participant can pick only one. |
| FR-1.2 | A question is **multiple-answer** when two or more options are marked correct. It shows as **checkboxes** with the hint *"Select all that apply."* |
| FR-1.3 | The question type is **derived automatically** from how many options the admin marks correct. The admin does not set it separately. |
| FR-1.4 | A question must have at least 2 and at most 8 answer options. |
| FR-1.5 | Each question must have at least one correct option. |
| FR-1.6 | Answer options are shuffled for each attempt (a per-quiz setting, on by default). |

**Example: multiple answer (preferred)**
> **What is the chief end of man?** *(Select all that apply)*
> 📖 *1 Corinthians 10:31 · Romans 11:36 · Psalm 73:25–28*
> ☐ **To glorify God** ☐ **To enjoy Him forever** ☐ To gain wealth and comfort ☐ To be free from all suffering in this life

**Example: single answer**
> **God created man in whose image?**
> 📖 *Genesis 1:26–27*
> ○ The image of the angels ○ **His own image** ○ The image of the animals ○ No image at all

### FR-2 Bible Verse References

| ID | Requirement |
|---|---|
| FR-2.1 | Each question must have **at least one** verse reference, and can have **as many as needed**. |
| FR-2.2 | A reference is stored in structured form (book, chapter, start verse, end verse) so it can be checked and displayed consistently, e.g. "Romans 3:23", "John 3:16–17". |
| FR-2.3 | Admin entry checks the book name against the 66 books of the Protestant canon and checks that chapter and verse numbers are valid. |
| FR-2.4 | The **verse text** is shown in full under each reference, in the **World English Bible (WEB)**, which is public domain. The full WEB text is stored in the app's own database. |
| FR-2.5 | In quiz mode, the question and **all** its verses appear first, **before the answer options** (see FR-3). In study mode, verses are always shown. |
| FR-2.6 | When a question has many verses, they appear as a scrollable list. Each verse can be collapsed or expanded, and all are expanded by default. |
| FR-2.7 | The explanation appears **after** the participant submits an answer. |

### FR-3 Taking a Quiz (Participant)

| ID | Requirement |
|---|---|
| FR-3.1 | Opening a quiz link shows a start screen with the quiz title, description, and number of questions, plus **Start Quiz** and **Study Mode** buttons. |
| FR-3.1a | Before the quiz starts, the participant must **enter their name** (required, 1–50 characters). The name is remembered on that device for later quizzes. |
| FR-3.2 | Questions are shown **one at a time**, with a progress indicator (e.g. "Question 3 of 10"). |
| FR-3.3 | Each question goes through three stages, in order (see the flow below). |
| FR-3.3a | **Stage 1: Read and think.** The question and all its verse references with verse text appear. The answer options are **hidden**. A **thinking timer** starts at once and counts down from **60 seconds** (the default; it can be changed per quiz, see FR-8.4). |
| FR-3.3b | The timer shows as a visible countdown (e.g. a ring or bar with "0:42"). It pauses if the participant switches to another tab or app, and resumes when they come back. |
| FR-3.3c | **"I'm ready"**: a button shown during the timer. Tapping it ends the thinking time early and shows the options. It is **on by default**, and the admin can turn it off for a quiz. |
| FR-3.3d | **Stage 2: Choose.** When the timer reaches zero (or the participant taps "I'm ready"), the answer options appear below the verses, which stay visible. There is **no time limit** for choosing. |
| FR-3.3e | **Stage 3: Feedback.** The participant taps **Submit Answer**. The app shows whether the answer was right, highlights the correct option(s), and shows the explanation. The participant then taps **Next Question**, which starts Stage 1 of the next question with a new timer. |
| FR-3.4 | The participant cannot change an answer after submitting it. |
| FR-3.4a | The answer options are **not sent to the browser** until the thinking stage ends, and correct answers are not sent until the participant submits, so neither can be seen early by inspecting the page. |
| FR-3.5 | **Scoring:** a question scores 1 point only if the participant chooses **every correct option and no wrong ones**. Otherwise it scores 0. For single-answer questions this simply means choosing the right one. |
| FR-3.5a | When a multiple-answer question is marked wrong, the feedback shows which correct options were missed and which wrong options were chosen. |
| FR-3.6 | The results screen greets the participant by name and shows the score (e.g. "Well done, John: 8/10, 80%"). It also shows a review of every question with the participant's answer, the correct answer, and the verses. |
| FR-3.7 | The results screen has **Retake Quiz** and **Share this Quiz** buttons. |
| FR-3.8 | If the participant refreshes the page in the middle of a quiz, their progress is kept in browser storage, including the time left on the current thinking timer. |

**Question flow (quiz mode)**

```
┌──────────────────────────┐   timer = 0    ┌──────────────────────┐   Submit   ┌───────────────────────┐
│ 1. READ & THINK          │  or "I'm       │ 2. CHOOSE            │ ─────────► │ 3. FEEDBACK           │
│ Question + all verses    │ ──ready" ────► │ Options appear below │            │ Right/wrong, correct  │
│ Options hidden           │                │ the verses           │            │ answer, explanation   │
│ Countdown 1:00 → 0:00    │                │ No time limit        │            │ [Next Question]       │
│ [I'm ready]              │                │                      │            │                       │
└──────────────────────────┘                └──────────────────────┘            └───────────┬───────────┘
            ▲                                                                               │
            └──────────────────────────── next question ────────────────────────────────────┘
```

**Example screen (Stage 1)**
> **Question 1 of 10**  ⏱ 0:42
> **God created man in whose image?**
> 📖 *Genesis 1:26* — "God said, 'Let's make man in our image, after our likeness…'" (WEB)
> 📖 *Genesis 1:27* — "God created man in his own image. In God's image he created him; male and female he created them." (WEB)
> *The answers will appear when the timer ends.*  **[ I'm ready ]**

### FR-4 Study / Read Mode

| ID | Requirement |
|---|---|
| FR-4.1 | Every quiz has a **Study Mode** that shows all questions on one page with the verses, the correct answers marked, and the explanations. People can read the quiz without taking it. No name is needed. |
| FR-4.2 | Study Mode has its own permanent URL (e.g. `/quiz/wsc-1-chief-end-of-man/study`) so it can be shared on its own. |
| FR-4.3 | Study Mode is print-friendly (a clean layout when printed or saved as PDF). |

### FR-5 Permanent, Frozen Shareable Links

| ID | Requirement |
|---|---|
| FR-5.1 | Each quiz gets a permanent URL with a readable slug, e.g. `https://<domain>/quiz/wsc-1-chief-end-of-man`. |
| FR-5.2 | The admin sets the slug when creating the quiz, or it is generated from the title. **Once the quiz is published, the slug is locked.** |
| FR-5.3 | Each quiz also has a short link (e.g. `/q/7Kx2`) that redirects to the slug URL. |
| FR-5.4 | **Frozen on publish:** when a quiz is published, the app saves a complete **snapshot** of it: settings, question order, prompts, options, correct answers, verse references and verse text, and explanations. The public link always serves that snapshot. |
| FR-5.5 | Editing a question in the bank later does **not** change any published quiz. It only affects drafts and quizzes published after the edit. |
| FR-5.6 | A published quiz cannot be edited. To correct or update it, the admin uses **"Create new version"**. This makes a draft copy with a new slug (e.g. `…-v2`), which the admin edits and publishes. Optionally, the old quiz shows a notice: *"A newer version of this quiz is available"*, with a link to the new one. The old link keeps working and its content does not change. |
| FR-5.7 | When a quiz is archived, its link shows a friendly "This quiz is no longer available" page instead of an error, plus a link to a newer version if there is one. |
| FR-5.8 | A share button copies the link and offers WhatsApp, Facebook, X, and email share options. |
| FR-5.9 | Shared links show a rich preview (Open Graph tags: quiz title, description, image) in WhatsApp and social apps. |
| FR-5.10 | The home page lists all published quizzes, grouped by series (e.g. "Westminster Shorter Catechism"). |

### FR-6 Admin: Authentication

| ID | Requirement |
|---|---|
| FR-6.1 | Every admin page sits under `/admin` and requires a login. |
| FR-6.2 | There is a single admin account, created during setup. The password is stored hashed (bcrypt or argon2). Sessions expire after inactivity. |
| FR-6.3 | Login attempts are rate-limited. |
| FR-6.4 | The admin can change the password from the admin page. A forgotten password is reset with a setup command run on the server (no email reset in v1). |

### FR-7 Admin: Question Bank Management

| ID | Requirement |
|---|---|
| FR-7.1 | The admin sees a **list of all questions** that can be searched by text and filtered by series/tag, Bible book, question type, and status. |
| FR-7.2 | The admin can **create** a question with: prompt text, verse references (add, remove, reorder; there is no limit), answer options (add, remove, reorder), correct option flags, explanation, tags/series, and difficulty. |
| FR-7.3 | While the admin types a reference, the WEB verse text is shown next to it so the admin can confirm it is the right passage. |
| FR-7.4 | The admin can **edit** a question. Edits never change published quizzes (FR-5.5). The editor shows which quizzes use the question. |
| FR-7.5 | The admin can **archive** a question, which hides it from the quiz builder. A question can be deleted only if no quiz has ever used it. |
| FR-7.6 | The admin can **preview** a question exactly as a participant would see it, including the timer. |
| FR-7.7 | The form checks for: at least 1 valid verse reference, at least 2 options, at least 1 correct option, and no empty option text. It shows a reminder if the explanation is empty. |
| FR-7.8 | **Bulk import:** the admin can upload a CSV or Excel file of questions using a provided template. Errors are reported row by row before anything is saved. Imported questions start as drafts. |
| FR-7.9 | **Bulk export:** the admin can download the question bank as CSV or JSON for backup. |

### FR-8 Admin: Quiz Management

| ID | Requirement |
|---|---|
| FR-8.1 | The admin can **create a quiz** with a title, slug, series, description, optional cover image, and settings. |
| FR-8.2 | The admin **adds questions** from the bank (search and select) and **reorders** them by drag and drop. |
| FR-8.3 | The admin can create a new question from inside the quiz builder. It is saved to the bank and added to the quiz. |
| FR-8.4 | Quiz settings: thinking time in seconds (default 60; 0 turns the timer off), "I'm ready" skip (on/off, default on), shuffle question order (default off, because catechism order matters), shuffle options (default on), show feedback after each question or only at the end (default after each), and Study Mode (on/off, default on). |
| FR-8.4a | (Optional) The admin can set a different thinking time for one question, e.g. 90 seconds for a long passage. |
| FR-8.5 | A quiz has a status of **Draft**, **Published**, or **Archived**. Only Published quizzes can be opened by the public. Before publishing, the app asks for confirmation and warns that the content will be frozen. |
| FR-8.6 | The admin can preview a draft quiz through a private preview link. |
| FR-8.7 | The admin can **duplicate** a quiz, or **create a new version** of a published quiz (FR-5.6). |
| FR-8.8 | The quiz list shows each quiz's title, series, status, question count, link (with a copy button), and basic statistics. |

### FR-9 Results and Analytics (Admin)

| ID | Requirement |
|---|---|
| FR-9.1 | For each quiz, the admin sees the number of attempts, number of completions, and the average score. |
| FR-9.2 | The admin sees a list of attempts for each quiz: participant name, date, and score. The list can be exported to CSV. |
| FR-9.3 | For each question, the admin sees the percentage of participants who answered correctly, plus how often each option was picked. This helps find questions that are unclear. |

## 6. Pages / Screens

### Public
| Page | URL (proposed) |
|---|---|
| Home: published quizzes by series | `/` |
| Quiz start screen (name entry) | `/quiz/{slug}` |
| Quiz in progress | `/quiz/{slug}/play` |
| Quiz results | `/quiz/{slug}/results` |
| Study / Read mode | `/quiz/{slug}/study` |
| Short link redirect | `/q/{shortId}` |
| Quiz unavailable | (shown at the quiz URL) |

### Admin
| Page | URL (proposed) |
|---|---|
| Login | `/admin/login` |
| Dashboard (summary stats) | `/admin` |
| Question bank list | `/admin/questions` |
| Add / edit question | `/admin/questions/new`, `/admin/questions/{id}` |
| Bulk import | `/admin/questions/import` |
| Quiz list | `/admin/quizzes` |
| Quiz builder / edit | `/admin/quizzes/new`, `/admin/quizzes/{id}` |
| Quiz results (attempts) | `/admin/quizzes/{id}/results` |
| Account (change password) | `/admin/account` |

## 7. Data Model (Logical)

```
Admin         (id, name, email, password_hash, created_at)        -- exactly one row

BibleVerse    (book, chapter, verse, text)                         -- full WEB text

Question      (id, prompt, explanation, difficulty, status[draft|active|archived],
               think_time_seconds [optional override], source_ref [e.g. "WSC Q1"],
               created_at, updated_at)
Option        (id, question_id, text, is_correct, sort_order)
VerseRef      (id, question_id, book, chapter, verse_start, verse_end, sort_order)
Tag           (id, name)                                           -- e.g. "WSC", "Salvation"
QuestionTag   (question_id, tag_id)

Series        (id, name, slug, description, sort_order)            -- e.g. "Westminster Shorter Catechism"

Quiz          (id, slug [unique, locked after publish], short_id [unique],
               series_id, title, description, cover_image_url,
               status[draft|published|archived],
               think_time_seconds [default 60], allow_early_reveal [default true],
               shuffle_questions [default false], shuffle_options [default true],
               feedback_mode[immediate|end], study_mode_enabled,
               previous_version_id, superseded_by_id,
               published_at, created_at, updated_at)
QuizQuestion  (quiz_id, question_id, sort_order)                   -- draft composition

QuizSnapshot  (quiz_id, published_at, content_json)                -- frozen copy served publicly

Attempt       (id, quiz_id, participant_name, started_at, completed_at, score, max_score)
AttemptAnswer (attempt_id, question_key, selected_option_keys[], is_correct)
```

Derived value: `question_type = (count of options where is_correct) > 1 ? "multiple" : "single"`.
Public quiz and study pages read only from `QuizSnapshot`, never from the live question tables.

## 8. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Responsive | Works well on phones (from 360px wide), tablets, and desktops. Mobile-first, because most sharing happens over WhatsApp. Verse text is easy to read (at least 17px on mobile). |
| NFR-2 | Performance | Quiz pages load in under 2 seconds on a 4G connection. Frozen snapshots are cached at the edge. |
| NFR-3 | Accessibility | Meets WCAG 2.1 AA: keyboard navigation, screen-reader labels on options, enough colour contrast, and right/wrong shown by more than colour alone. Screen readers announce the timer at intervals (not every second) and announce when the options appear. |
| NFR-4 | Security | Admin routes are protected on the server side, with HTTPS everywhere and CSRF protection. Answer options and correct answers are released only as described in FR-3.4a. |
| NFR-5 | Reliability | Daily automated database backups. Published snapshots are never changed or deleted. |
| NFR-6 | SEO | Published quiz and study pages can be indexed by search engines, with proper titles and meta descriptions. |
| NFR-7 | Browser support | The latest two versions of Chrome, Safari, Firefox, Edge, plus mobile Safari and Chrome. |
| NFR-8 | Licensing | Verse text is WEB (public domain). The Westminster Shorter Catechism (1647) is public domain. |
| NFR-9 | Privacy | The only personal data collected is the name the participant enters. It is shown only to the admin, never publicly. There are no tracking cookies. The start screen has a short note explaining that the name is saved with the score. |

## 9. Proposed Technical Approach (for discussion)

| Layer | Proposal | Reason |
|---|---|---|
| Frontend + backend | **Next.js** (React, TypeScript) | One codebase for public pages and admin pages. Server rendering supports SEO and link previews. |
| Database | **PostgreSQL** (e.g. Supabase or Neon) | Relational data fits questions, options, and quizzes well. Free tiers are available. |
| Auth | Single admin login with a hashed password (Auth.js credentials) | Simple. No third-party sign-in needed for one user. |
| Bible text | Full WEB text loaded into the `BibleVerse` table | No dependency on an outside API, and no licensing risk. |
| Hosting | **Vercel** (or similar) | Free to start, custom domain, global CDN. |

## 10. Initial Content: Westminster Shorter Catechism

The first question bank is the **Westminster Shorter Catechism (WSC)**: 107 questions and answers, each with its proof texts. **The developer imports it directly** with a one-time seed script. The admin does not need to type it in.

### 10.1 How each catechism question becomes a quiz question

| Part | Rule |
|---|---|
| Prompt | The catechism question, word for word (e.g. *"What is the chief end of man?"*). |
| Verse references | The standard WSC proof texts for that question, shown in WEB. |
| Correct options | The catechism answer split into its separate truths. For example, Q1's answer "to glorify God, and to enjoy him for ever" becomes two correct options, making it a multiple-answer question (FR-0.3). |
| Wrong options | 2–4 plausible statements that the proof texts contradict (FR-0.4), written for each question. |
| Explanation | The full catechism answer quoted word for word, plus a one-line note linking it to the verses. |
| Tags / source | Tagged `WSC`, with `source_ref` set to "WSC Q{n}". Topic tags (e.g. God, Sin, Salvation, Commandments, Prayer) are added too. |
| Status | Imported as **Draft**, so the admin can review each question before any quiz is published (important, because published quizzes are frozen). |

### 10.2 Grouping into quizzes (approved) (series: "Westminster Shorter Catechism")

| Quiz | Catechism questions | Theme |
|---|---|---|
| WSC 1 | Q1–3 | Man's chief end and the Scriptures |
| WSC 2 | Q4–12 | God, His decrees, creation and providence |
| WSC 3 | Q13–20 | The fall, sin, and the covenant of grace |
| WSC 4 | Q21–28 | Christ the Redeemer |
| WSC 5 | Q29–38 | The benefits of redemption |
| WSC 6 | Q39–52 | The moral law and commandments 1–2 |
| WSC 7 | Q53–62 | Commandments 3–4 |
| WSC 8 | Q63–81 | Commandments 5–10 |
| WSC 9 | Q82–90 | Sin's desert, faith, repentance and the Word |
| WSC 10 | Q91–97 | The sacraments: baptism and the Lord's Supper |
| WSC 11 | Q98–107 | Prayer and the Lord's Prayer |

Each quiz keeps catechism order (shuffle questions off) and uses the default 60-second thinking timer.

### 10.3 Import acceptance
- All 107 questions are in the bank, each with at least one proof text, its WEB verse text, at least 2 options, and the catechism answer in the explanation.
- The 11 draft quizzes exist with the questions in catechism order.
- An import report lists any proof text that could not be matched to a WEB verse, so it can be fixed by hand.

## 11. Acceptance Criteria (Summary)

1. The admin can log in, add a question with two references (Genesis 1:26 and 1:27), see the WEB text while typing them, add 4 options, and save it.
2. A question with one correct option shows radio buttons. A question with two or more shows checkboxes with "Select all that apply."
3. A question cannot be saved without a valid verse reference.
4. The admin can create a quiz, add questions, publish it (after a frozen-content warning), and copy its link.
5. Opening that link in a private browser window asks for a name, then runs the quiz.
6. On each question, the question and all its verses show first and a 60-second countdown runs. The options appear only when the countdown ends or "I'm ready" is tapped, and are not in the page source before then.
7. Switching to another tab pauses the countdown, and coming back resumes it.
8. On a multiple-answer question, choosing only some of the correct options scores 0, and the feedback shows what was missed.
9. The results screen shows the participant's name and score. The admin sees the same attempt on the quiz results page.
10. Editing a question in the bank **does not** change a quiz that is already published, and the link shows exactly the same content as before.
11. "Create new version" makes a new draft with a new link, and the old link keeps working with its original content.
12. Archiving the quiz makes its link show "no longer available" instead of an error.
13. Pasting the link into WhatsApp shows a preview with the quiz title.
14. A visitor who is not logged in cannot reach any `/admin` page.
15. The WSC import meets §10.3.

## 12. Decisions and Open Questions

### 12.1 Decided
| # | Topic | Decision |
|---|---|---|
| D1 | Admins | Only the owner, a single admin account. |
| D2 | Participant identity | Participant must enter a name. No accounts, no leaderboard. |
| D3 | Translation | World English Bible (WEB), English only. |
| D4 | Multiple-answer scoring | Every correct option (and no wrong one) must be chosen to score. |
| D5 | Edits after sharing | Published quizzes are frozen. Changes go into a new version with a new link. |
| D6 | Verses | At least one per question, no maximum. Shown with the question, before the answers. |
| D7 | Thinking timer | 60 seconds by default, with an "I'm ready" skip button on by default. |
| D8 | Question style | Verse-based only, no trivia. Prefer multiple-answer where the verses support it. Radio buttons when there is one answer, checkboxes when there are several. |
| D9 | First content | Westminster Shorter Catechism, imported directly by the developer. |
| D10 | WSC grouping | 11 quizzes, as in §10.2. |

### 12.2 Still open
| # | Question | Current assumption |
|---|---|---|
| Q1 | Should there be a time limit for **choosing** once the options appear? | No limit. |
| Q2 | Should feedback come after each question (default) or only at the end? | After each question. |
| Q3 | **Branding and domain:** is there an app name, logo, church or ministry name, or a domain you already own? | Generic name, to be decided. |
| Q4 | **Hosting:** is it OK to start on free-tier hosting (Vercel + Supabase/Neon)? | Yes. |
