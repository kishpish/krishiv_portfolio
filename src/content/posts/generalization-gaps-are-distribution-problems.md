---
title: "Most generalization gaps are distribution problems"
description: "When a model transfers badly the reflex is to blame capacity. Usually it is the split, and there is a cheap procedure for finding out which."
tags: ["generalization", "evaluation", "representation-learning"]
section: "Methods & evaluation"
status: "note"
---

A model scores well in validation and badly in deployment. The first explanations reached for are almost always about the model: not enough capacity, wrong architecture, needs more pretraining.

In my experience the split did it. Random splits measure interpolation within clusters that exist in both train and test, and we call the result generalization because the held-out examples were held out.

## How splits leak

The mechanisms are domain-specific and they rhyme.

Sequence data leaks through homology. Hold out random proteins and paralogs of training proteins land in test at high identity. The model has effectively memorized the answer under a different accession number.

Genomic data leaks through linkage. Nearby variants are correlated across the whole population, so a random split over loci puts correlated neighbors on both sides.

Single-cell data leaks through donors and batches. Cells from one person appear in train and test, so you measure how well the model recognizes that person rather than how well it generalizes to a new one.

Medical imaging leaks through patients, scanners, and sometimes a scanner-specific artifact in the corner of the frame.

In every case the random split is a sanity check on the fitting procedure and nothing more. Grouped splits, by chromosome, by identity threshold, by donor, by site, are the ones that estimate deployment. Performance drops. That drop is the measurement you came for.

The unglamorous part is auditing whether the grouped split actually separated things. Splitting genes by whole chromosome removes positional leakage but leaves paralogs scattered across chromosomes, so in the benchmark I built it took an explicit pass over 251,275 gene pairs to find what the chromosome split had missed. No figure came out of that. Every figure depends on it.

## Localizing a transfer gap

Suppose the grouped split hurts and you want to know why. Write the model as a composition:

$$f = h \circ \phi$$

$\phi$ is the learned representation, $h$ is the head fit on top. The excess risk under distribution shift has to come from one of three places:

1. **The representation.** $\phi$ encodes features that do not transfer to new groups.
2. **The fitting procedure.** $h$ is overfit, badly regularized, or the wrong functional form.
3. **The labels.** The per-group noise ceiling is low and you are at it.

These demand different responses and look identical from the aggregate number. The way to separate them is to vary one at a time.

Fit several heads of increasing complexity on frozen $\phi$. If a richer $h$ does not help and a simpler $h$ does not hurt, the head is not binding. That rules out (2).

Refit $\phi$ on held-in groups only, with $h$ fixed. If the representation moves the number and the head did not, $\phi$ is the bottleneck. That implicates (1).

Compare against a per-group ceiling. Heritability bound, replicate agreement, inter-annotator agreement, whatever the domain offers. If you are near it, the model is done and the problem is measurement. That is (3).

Usually exactly one moves and the other two sit flat, which is a pleasantly decisive outcome for a procedure this cheap. In the expression benchmark it was the representation. The map from sequence to individual-level variation was the thing that did not transfer, and the fitting was fine. That narrows the search from "try everything" to "the features are wrong," which is a different research program with a different literature attached.

## Why I think this is underused

It takes an afternoon. It requires no new training runs beyond refits. And it converts a vague result into a specific one, which is the entire job.

My guess at why it is rare: the result is often that your contribution is not the binding constraint. If you built the architecture and the ablation says the head and the ceiling are fine but the features do not transfer, you have learned something true and inconvenient. The incentive is to report the aggregate number and move on.

## The claim

A paper that reports only random-split performance has not reported a generalization result. It has reported that the optimizer worked.

The fix is not expensive. State the grouping and why it is the right one. Audit the grouping and report what the audit caught. Show the drop from random to grouped, because the size of that drop is itself informative about how much leakage the naive setup had. And when it drops, localize it before proposing a remedy, because the three causes have nothing in common and guessing wrong costs months.
