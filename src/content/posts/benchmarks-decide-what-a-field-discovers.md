---
title: "Benchmarks decide what a field discovers"
description: "A split is a research agenda in disguise. Choose it badly and a whole subfield spends years getting better at the wrong question."
tags: ["evaluation", "genomics", "benchmarks"]
section: "Methods & evaluation"
status: "note"
---

A benchmark looks like a measuring instrument. It is actually a statement about which question is worth answering, and everyone who optimizes against it agrees to that statement whether they read it or not.

Here is the version of this I ran into. DNA sequence models are evaluated on gene expression prediction, and the headline numbers are excellent. Correlations in the high 0.7s, sometimes 0.8. The standard evaluation holds out genes: train on some genes, predict others, correlate predicted against measured across the held-out set. By that measure the field has been winning for years.

Now write the expression matrix out. Let $y_{g,n}$ be the expression of gene $g$ in individual $n$, and decompose it:

$$y_{g,n} = \bar{y}_g + \delta_{g,n}$$

$\bar{y}_g$ is the gene's mean across people. $\delta_{g,n}$ is how much one person deviates from it. Gene means span four or five orders of magnitude. Ribosomal protein genes are enormous in every cell in every person. Olfactory receptors are near zero in everyone. Individual deviation around that mean is, for most genes, a few percent.

So $\mathrm{Var}_g(\bar{y}_g) \gg \mathrm{Var}_n(\delta_{g,n})$, by a lot, and the across-gene correlation is dominated almost entirely by the first term. A model that ignores every individual and predicts only $\bar{y}_g$ scores beautifully on the standard benchmark. It also scores exactly zero on the question of who expresses what.

That second axis is the one that connects a genome to a disease. You do not get a GWAS hit because ribosomal genes are highly expressed. You get it because *this person's* allele shifts *this gene* by a little, in a tissue that matters. Every clinical application of sequence models runs through $\delta$, and the benchmark the field optimized against is almost pure $\bar{y}$.

The failure was named repeatedly in the literature. Nobody measured it, because measuring it requires building a benchmark that isolates the cross-individual axis, and building benchmarks is not how you get cited.

## What isolating the axis costs

When you do build it, three things immediately go wrong, and all three are instructive.

**You need a ceiling, or the number is meaningless.** Suppose a per-gene model reaches a correlation of 0.23 on unseen individuals. Is that good? Unanswerable in isolation. Sequence can only explain the heritable component, so the achievable ceiling for gene $g$ is roughly $h_g$, the square root of its cis-heritability. If $h^2_g = 0.06$, the ceiling is about 0.24 and 0.23 is nearly perfect. If $h^2_g = 0.8$, the ceiling is 0.89 and 0.23 is a disaster. A benchmark that reports scores without ceilings is publishing uninterpretable numbers with error bars on them.

**Your splits leak in ways that are invisible until you audit them.** Hold out random genes and a paralog of a training gene lands in test with 90% sequence identity. The model has effectively seen it. Splitting by whole chromosome fixes the obvious version. The non-obvious version needs an explicit paralog audit, which in my case meant scoring 251,275 gene pairs to find out how much of the test set was a near-copy of something in train. That work produces no plot. It is the reason the plots mean anything.

**Scores collapse, and the collapse is the result.** Simple per-gene models get to a median of 0.23 across individuals. A large pretrained sequence model sits near 0.05 and is frequently pointed the wrong way. The pretrained model is better at almost everything else and loses badly here. That gap is not an embarrassment to be smoothed over. It is a measurement, and it is the first honest one anybody has of that particular failure.

## The thing I actually believe

A benchmark is a research agenda with a leaderboard attached. Whoever defines the split defines what counts as progress, and the field will faithfully optimize toward it for as long as the split stands.

Which means the most leveraged thing you can do in a young subfield is often not a new architecture. It is to look hard at what the standard evaluation rewards, find the axis it silently averages over, and build the thing that measures it. The reward structure is bad for this: a benchmark paper gets filed under "resources," while a model that tops the old benchmark gets the talk. That mispricing is why these holes sit open for years at a time.

Three properties I would want in any benchmark before I trusted a number from it. State the ceiling, so a low score can be interpreted rather than just ranked. Audit the split for leakage explicitly and report what the audit found, including the parts that failed. And make sure the axis being measured is the axis somebody downstream actually needs, which requires asking a person who works downstream.

None of that is hard. It is just unrewarded, which is a different problem and a worse one.
