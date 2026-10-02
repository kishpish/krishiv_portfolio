# Writing

Ten posts. No dates, intentionally. They are organized by subject and by depth.

## Frontmatter schema

```yaml
---
title: string          # post title, sentence case
description: string    # one or two lines, used for cards, meta, and OG
tags: string[]         # lowercase, hyphenated
section: string        # grouping, see below
status: string         # "note" | "essay" | "in progress"
---
```

No `date` field anywhere. Do not add one, do not infer one from git history, do not sort by it.

## Sections, and the one-liner each should carry on the index

Modeled on how Alan groups his notes, with a short editorial subtitle under each heading rather than a date.

| `section` | Subtitle to use | Posts |
| --- | --- | --- |
| `Models & objectives` | What a model is actually optimizing, and what that costs. | 4 |
| `Methods & evaluation` | How results get believed, and how they should be. | 3 |
| `State of the field` | Opinions about where this is going. | 2 |
| `Systems` | The unglamorous half. | 1 |

## Rendering notes

Every post contains LaTeX, inline and display, in standard `$...$` and `$$...$$` delimiters. Render at build time.

Several contain markdown tables. All contain internal structure via `##` headings, so a per-post table of contents built from H2s will work without any extra frontmatter.

Reading times run 4 to 5 minutes at 225 words per minute. Compute them rather than hardcoding.

## Cross-links worth wiring

These posts reference each other's ideas and would benefit from explicit links if the site supports them:

- `what-the-score-function-actually-buys-you` and `energy-is-a-modeling-choice` are two halves of one argument about score-based models.
- `benchmarks-decide-what-a-field-discovers` and `generalization-gaps-are-distribution-problems` both come out of the leakage-audited benchmark work and share the paralog audit.
- `confidence-is-not-correctness` and `reward-is-a-bad-interface-for-design` are both about metrics breaking under optimization pressure.
- `scaling-laws-are-a-regularity` and `protein-language-models-have-a-units-problem` are both arguments that scale is the wrong axis in bounded-data domains.
