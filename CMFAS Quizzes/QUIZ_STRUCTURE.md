# CMFAS Module 9 Quiz Structure Reference

This document describes the structure, format, and behaviour of the CMFAS Module 9 practice quizzes, as originally hosted on Microsoft Forms. Use this as a spec when rebuilding the quiz experience in code.

---

## Overview

There are 4 quizzes in total, each stored as a separate JSON file:

| File | Title |
|------|-------|
| `CMFAS_M9_SetA.json` | CMFAS MODULE 9 Set A |
| `CMFAS_M9_SetB.json` | CMFAS Module 9 Set B |
| `CMFAS_M9_MockExam1.json` | CMFAS M9 Mock Exam 1 |
| `CMFAS_M9_MockExam2.json` | CMFAS M9 Mock Exam 2 |

Each quiz also has a corresponding answer key file (e.g. `CMFAS_M9_SetA_AnswerKey.json`).

All 4 quizzes share identical structure and rules.

---

## Quiz Rules

- **100 multiple-choice questions** per quiz, each with exactly **4 options** (A, B, C, D).
- **Single correct answer** per question — no multi-select.
- **Duration: 120 minutes** (2 hours). The timer starts when the candidate begins the quiz.
- **Passing grade: 70/100** (70%).
- **Scoring: +1 for correct, 0 for wrong or blank.** No negative marking.
- Candidates should answer all questions before submitting. Once submitted, they cannot go back.
- Prepared for **Prudential Assurance Company Singapore (Pte) Limited** — strictly for internal use.

---

## JSON Schema

### Quiz File

```json
{
  "quiz_title": "CMFAS MODULE 9 Set A",
  "version": "M9 7th Edition Set A",
  "prepared_for": "Prudential Assurance Company Singapore (Pte) Limited",
  "date": "April 2026",
  "total_questions": 100,
  "format": "Multiple Choice",
  "duration": "120 minutes",
  "passing_grade": "70% (70/100)",
  "questions": [ ... ]
}
```

### Standard Question (most questions)

```json
{
  "question_number": 1,
  "question": "The question text goes here?",
  "reference": "C17/1.18",
  "options": [
    "Option A text.",
    "Option B text.",
    "Option C text.",
    "Option D text."
  ],
  "correct_answer_letter": "C",
  "correct_answer": "Option C text."
}
```

### Shared Passage Question (calculation groups)

Some questions at the end of the quiz share a common data block / passage. These questions have an additional `shared_passage` field and MUST be presented together as a group. The passage provides the data needed to answer all questions in the group.

```json
{
  "question_number": 96,
  "question": "How many units are allocated to the policy?",
  "reference": "C9",
  "options": ["16,325 units.", "17,218 units.", "19,322 units.", "23,123 units."],
  "correct_answer_letter": "B",
  "correct_answer": "17,218 units.",
  "shared_passage": "For all calculation questions in this set, use the interest table from the textbook to compute the answers, where applicable. Consider the following information relating to a Single Premium Investment linked plan, for questions 96 - 98:\nSingle Premium = $25,000\nOffer price = $1.40\nBid-offer spread = 5% throughout\nPolicy fee = $100\nAdministrative fee & Mortality charge = 3% of single premium\nThe plan grows at 7% pa throughout\nAssumption: All fees and charges are deducted by the cancellation of units at the inception of the policy."
}
```

**Shared passage groups across quizzes:**

| Quiz | Grouped Questions | Passage Topic |
|------|-------------------|---------------|
| Set A | Q96, Q97, Q98 | Single Premium ILP calculation |
| Mock Exam 1 | Q98, Q99 | Single Premium ILP calculation |
| Set B | None | — |
| Mock Exam 2 | None | — |

**Important:** Questions sharing a `shared_passage` must always be displayed together. The passage should be shown once at the top, followed by the individual questions in order. These questions should never be separated or randomised independently.

### Answer Key File

```json
{
  "quiz_title": "CMFAS MODULE 9 Set A",
  "version": "M9 7th Edition Set A",
  "total_questions": 100,
  "answers": [
    {
      "question_number": 1,
      "correct_option_letter": "C",
      "correct_answer": "Option C text."
    }
  ]
}
```

---

## Question Types

All questions are single-choice MCQ, but they vary in structure:

### 1. Direct Knowledge Questions (~70% of questions)
Short, straightforward questions testing factual recall.
> "Which report gives the history of illness life insured has suffered or is still suffering?"

### 2. Scenario / Case-Based Questions (~25% of questions)
A mini-scenario is embedded in the question text, followed by a question about it. These are self-contained — the scenario and question are in the same `question` field.
> "Mrs. Tang has a $100,000 whole life plan with a 60% Acceleration Critical Illness rider (CI) and an Accidental Death Benefit rider (ADB) for $100,000. Assuming Mrs. Tang contracts a critical illness and her claim is admitted by the company, which one of the following statements is not true?"

### 3. Passage-Based Calculation Questions (~5% of questions)
A shared data block provides numbers (premiums, unit prices, charges, etc.) and 2–3 follow-up questions use that data. Identified by the presence of `shared_passage` field. Always grouped together at the end of the quiz (Q96–Q100 range).

---

## Reference Codes

Most questions (~96–99%) include a `reference` field pointing to the textbook section. The format is:

```
C{chapter}/{section}
```

Examples:
- `C17/1.18` — Chapter 17, section 1.18
- `C5/1.50(l) (m)` — Chapter 5, section 1.50, subsections (l) and (m)
- `C12/Table 12.2` — Chapter 12, Table 12.2
- `C1/13.7 (4th bullet Pt)` — Chapter 1, section 13.7, 4th bullet point
- `C6/2.14 (eg 6.2)` — Chapter 6, section 2.14, example 6.2
- `C9/ Appendix 9A 1.3` — Chapter 9, Appendix 9A, section 1.3
- `C17/3.4 & 9.27` — Chapter 17, sections 3.4 and 9.27

A small number of questions (1–4 per quiz) have an empty `reference` field.

---

## Answer Distribution

Answers are spread roughly evenly across A/B/C/D in most quizzes:

| Quiz | A | B | C | D |
|------|---|---|---|---|
| Set A | 21 | 27 | 27 | 25 |
| Set B | 25 | 24 | 23 | 28 |
| Mock Exam 1 | 24 | 24 | 26 | 26 |
| Mock Exam 2 | 18 | 27 | 17 | 38 |

---

## Original Microsoft Forms Behaviour (for UI reference)

The original quiz on Microsoft Forms had this flow:

1. **Landing page** — shows quiz title, instructions (format, duration, passing grade, disclaimers).
2. **Page 1** — all 100 MCQ questions displayed on a single scrollable page. Each question shows the question number, question text, reference code (in a subtitle), and 4 radio button options. A countdown timer runs in the header.
3. **Page 2** — candidate details form: Name, Agency Leader Name, Unit Code. Followed by a Submit button.
4. **Results page** — shows total score (e.g. "18/100"), time taken, and per-question results. Each question shows whether the answer was Correct/Incorrect, the points awarded, the candidate's selected answer, and the correct answer text.

---

## Usage Notes for Building a Quiz App

- When presenting questions, show the `reference` code as a subtitle or tag below the question — it helps candidates study.
- The `correct_answer` field always matches `options[index]` where index = A→0, B→1, C→2, D→3. Use `correct_answer_letter` for grading logic.
- For shared passage groups: render the passage once as a highlighted block, then render each question below it. Do not allow these questions to be shuffled away from each other.
- If implementing question randomisation, treat shared-passage groups as atomic units — shuffle the group as a whole, but keep internal order intact.
- Option order should NOT be randomised — the correct answer letter must remain stable since answer keys reference it.
