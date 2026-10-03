---
title: "A leakage-audited benchmark for cross-individual expression prediction"
short: "Expression benchmark"
order: 3
period: "2026"
role: "First author"
kind: independent
paper: expression-iccbb-2026
summary: >-
  Sequence models rank expression well across genes and badly across
  individuals, and the cross-individual axis is the one that connects a genome
  to a person's disease risk. The benchmark joins lymphoblastoid expression to
  high-coverage genotypes for 449 individuals under whole-chromosome gene
  splits, a 251,275-pair paralog audit, an ancestry-only negative control, and
  per-gene cis-heritability ceilings. Per-gene linear models reach a median
  correlation of 0.23 on held-out European individuals while a pretrained
  sequence model run zero-shot sits at 0.05 with a bootstrap interval spanning
  zero. The contribution is the audit rather than the model: it measures a gap
  the field had so far only described.
problem: >-
  Sequence models predict expression across genes very well and across
  individuals very badly. The second axis is the one that connects a genome to
  a person's disease risk, and the field has named this failure repeatedly
  without building the measurement that would let anyone track it. A benchmark
  that does not control for homology or for population structure will report
  progress that is not there.
approach: >-
  Build the benchmark first and the model second. Join lymphoblastoid
  expression to high-coverage genotypes for 449 individuals. Split genes by
  whole chromosome so no test gene shares a chromosome with a training gene,
  split individuals with families kept together, and audit what survives
  against a quarter of a million paralog pairs. Give each gene a heritability
  ceiling, so that a low score can be read as a hard gene rather than a bad
  model.
result: >-
  On held-out individuals, simple per-gene models reach a median correlation
  around 0.23 across the learnable genes, while a pretrained sequence model run
  zero-shot sits near 0.05 with a bootstrap interval that includes zero. Three
  separate attempts to transfer a gene-agnostic map all came back negative,
  which points at the learned variant-effect map rather than the fitting
  procedure as the thing that does not transfer.
landscape: >-
  The odd one out, and the one that keeps the rest honest. A benchmark is the
  measuring instrument; the other four projects are only as good as the
  instrument pointed at them.
headline: "449 people"
evidence:
  - value: "449"
    label: "individuals, genotypes joined to expression"
  - value: "251,275"
    label: "paralog pairs audited for leakage"
  - value: "0.23"
    label: "median ρ on held-out individuals, 78 learnable genes, European subset"
  - value: "0.05"
    label: "pretrained sequence model, zero-shot, 15 genes"
figure:
  id: expression-benchmark
  caption: >-
    The same fifteen genes, scored two ways on the same held-out individuals. A
    per-gene model fitted on that gene's own labels reaches the blue mark; a
    pretrained sequence model run zero-shot reaches the orange one. The grey tick
    is the square root of that gene's estimated heritability, which is roughly
    the best any method could do from local sequence. The pretrained model
    scatters either side of zero, with a median of 0.05 and a bootstrap interval
    that spans it, while the per-gene models get a long way toward the ceiling
    on most of these genes.
  alt: >-
    A dumbbell chart with one row per gene for fifteen genes. Each row has a blue
    dot for the per-gene linear model's correlation and an orange dot for the
    pretrained sequence model's correlation, joined by a line, with a grey tick
    marking the heritability ceiling. Blue dots run from about zero to 0.84, most
    of them between 0.24 and 0.64. Orange dots scatter from about minus 0.4 to
    0.56, with a median near zero.
thumb:
  src: "/media/fig-benchmark"
  width: 800
  height: 570
  fallback: png
  alt: >-
    Scatter plot of a pretrained sequence model\u2019s predicted variant effect against the measured eQTL effect, with most points flat against zero on the vertical axis.
links: []
related:
  - benchmarks-decide-what-a-field-discovers
  - generalization-gaps-are-distribution-problems
  - confidence-is-not-correctness
---

## The two axes people keep conflating

Ask a sequence model which of two genes is more highly expressed in a tissue
and it will usually be right, because promoters and chromatin context differ
enormously between genes and the model has learned that. Ask it which of two
people expresses the same gene more and it has to resolve the effect of a
handful of common variants on one promoter, against a background of everything
else that differs between two humans.

These are not the same task and a single correlation number can hide which one
you measured. Cross-individual prediction is the axis that matters for disease
risk, and it is the one that gets reported least.

## Designing a benchmark to be hard to cheat

**Whole-chromosome gene splits.** Holding out random genes leaks: a test gene's
near-duplicate sits in training with a nearly identical promoter. Splitting by
whole chromosome removes the easiest version of that.

**A paralog audit, because the chromosome split is not enough.** Against
251,275 paralog pairs, 300 of the 456 held-out genes in the primary fold still
have a paralog somewhere in training. That number is the honest headline of the
split design: whole-chromosome splitting is necessary and it does not finish
the job, and the remaining homology-hard subset is smaller than you would hope.

**Families kept together.** Related individuals across a split is the same
leak one level up.

**Population structure as a named adversary.** An ancestry-only control, with
no sequence information at all, scored around 0.20 within a single continental
group. That is not a model working, it is sub-population structure being
predictive. After residualizing on sub-population labels using training data
only, the ancestry-only control drops to zero and the real models hold around
0.23. Without that control the benchmark would have reported a result that was
mostly geography.

**And the honest limit on all of it.** Those numbers are within Europeans.
Tested on the Yoruba individuals held out for exactly this purpose, the same
models fall from about 0.23 to about 0.05. That is how far any of this
transfers today, and it is the reason the cohort is 449 people rather than the
360 the main comparison uses.

**A ceiling per gene.** Most genes carry very little local heritable signal:
the median estimate on the evaluated chromosome is about 0.015, and only 78 of
330 genes pass a threshold where a correlation above roughly 0.22 is even
reachable. Scoring a model on a gene where nothing is learnable produces a
number that means nothing.

## The comparison, stated carefully

The headline comparison is 0.23 against 0.05, and the two numbers come from
different gene sets: 0.23 is the median over all 78 learnable genes, and 0.05
is the pretrained model's median over the 15 highest-heritability genes, with a
bootstrap interval spanning zero.

On those same 15 genes, the per-gene models reach 0.38 to 0.46. So the
conservative framing, 0.23 versus 0.05, understates the gap rather than
inflating it, and the figure above shows the honest version: same genes, same
individuals, both methods.

The pattern replicates on a second chromosome.

## Three negative results

I tried to close the gap three ways, and none of them worked.

A motif-grammar model trained to transfer across genes scored around zero
zero-shot. A few-shot setup, using a transfer prior to pick which variants to
look at, did no better than picking the same number of variants at random.
Adding in-silico mutagenesis scores from the pretrained model as features made
per-gene predictions worse, not better.

Three negatives from different directions is weak evidence for a positive
claim, and I want to be careful about how strong I make it: the evidence points
toward the learned variant-effect map as the thing that does not transfer, and
not toward the fitting machinery or the feature source. That is an
interpretation drawn from small experiments, and I would call it a hypothesis
with support rather than a localization.

## The direction-of-effect result

A separate check: for known expression-associated variants, does the pretrained
model at least get the sign right? Across 189 variants where the model produced
a nonzero response, sign agreement was 49.7%, which is chance. Restricted to
the quartile where it responded most strongly, agreement rose to about 70%.

One caveat I would not want to leave out: inference ran in reduced precision,
and the outputs show visible quantization, with about half the tested variants
producing exactly zero response. Some of that flatness may be numerical rather
than a property of the model, and distinguishing those two would mean rerunning
at full precision.
