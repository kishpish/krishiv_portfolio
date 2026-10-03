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
  zero. The splits, the paralog audit and the per-gene ceilings ship frozen, so
  a new model can be scored on the same held-out genes and individuals, with
  genes seen in training kept separate from genes never seen and each
  correlation read against the ceiling it could reach.
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
abstract_kind: summary
abstract: >-
    Sequence-to-expression models predict expression well across genomic loci and badly across
    people: from one person's nearby variants they cannot say who expresses a gene more highly.
    Per-gene linear models can, but they are undefined on a gene with no training labels, so a
    model that transferred cis-regulatory grammar to an unseen gene would be a new capability
    rather than a better score. This work builds a leakage-audited benchmark on fully open data
    to test for it, with frozen family-grouped individual splits and chromosome-level gene
    splits. On held-out chromosome 22 genes the per-gene linear baselines reach a median
    Spearman correlation of about 0.4 while a pretrained sequence model run zero-shot sits near
    0.05. Three gene-agnostic transfer approaches are tested and none closes the gap, and the
    European to African ancestry drop runs 72 to 79 percent. The bottleneck is localised to the
    learned variant-effect map: the model's sign agreement with measured eQTLs is 49.7 percent
    overall, which is chance, but 69.6 percent on the high-confidence subset where it predicts a
    large effect. Negative controls pass, with permuted labels giving a correlation of about
    zero.
plate:
  caption: >-
    Why the transfer fails on average, and what is left underneath it. Per-gene
    linear models predict which individuals have higher expression of a held-out
    chromosome 22 gene; a pretrained sequence model run zero-shot does not, and
    half its genes fall below zero correlation. The second panel says why. Most
    variants draw a near-zero, direction-less response, so sign agreement across
    all of them sits at chance, 49.7 percent. For the sparse subset where the
    model does predict a large effect, the direction is right 69.6 percent of
    the time. The representation holds real directional grammar, it is just too
    sparse to survive averaging.
  panels:
    - src: "/media/fig-benchmark"
      width: 900
      height: 627
      fallback: png
      label: a
      title: Held-out-gene failure reproduction
      alt: >-
        Box plot comparing three methods on held-out chromosome 22 genes. Two
        per-gene linear models sit well above zero correlation, while a
        pretrained sequence model run zero-shot sits on the zero line, with half
        its genes below it.
    - src: "/media/fig-benchmark-direction"
      width: 806
      height: 614
      fallback: png
      label: b
      title: Direction of effect against measured eQTLs
      alt: >-
        Scatter of the model's predicted variant effect against the measured
        eQTL effect. Almost every point sits flat on the zero line whatever the
        measured effect, and the handful of points with a large predicted effect
        mostly fall in the quadrants where the two agree in sign.
thumb:
  src: "/media/fig-benchmark"
  width: 900
  height: 627
  fallback: png
  alt: >-
    Box plot comparing three methods on held-out chromosome 22 genes. Two per-gene
    linear models sit well above zero correlation, while a pretrained sequence
    model run zero-shot sits on the zero line, with half its genes below it.
  fit: contain
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
