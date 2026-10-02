---
title: "Scaling laws are a regularity, not a law"
description: "A measured relationship that holds over a particular data regime got promoted to a principle, and the promotion is doing damage in domains where the regime does not hold."
tags: ["scaling", "state-of-the-field", "foundation-models"]
section: "State of the field"
status: "note"
---

The scaling literature is good empirical work. Fit loss as a function of parameters and data, find clean power laws across many orders of magnitude, use them to predict the performance of runs too expensive to do twice. That is a real contribution and it changed how large models get planned.

What happened next is that "scaling law" started getting used as though it described a property of learning itself rather than a curve fit to a particular corpus under a particular objective. In language the regime is favorable enough that the distinction rarely bites. In scientific domains it bites immediately, and the field keeps acting surprised.

The usual form:

$$L(N, D) \approx \frac{A}{N^{\alpha}} + \frac{B}{D^{\beta}} + L_\infty$$

Three terms. Most of the discussion is about the first two.

## The term nobody wants to talk about

$L_\infty$ is the irreducible loss, the floor you approach with infinite parameters and infinite data. In language modeling it is roughly the entropy of text, and it is low enough that there is a lot of headroom between where models sit and where they stop improving.

In biological data, $L_\infty$ includes measurement noise, batch effects, donor variation you did not record, and the simple fact that the same perturbation on the same cell line in two labs gives different numbers. It is large. In some assays it is most of the variance.

Which produces a situation that looks like success and is not: you sit on a textbook power law, every increase in scale lowers loss exactly as predicted, and the curve asymptotes to a value where the model is still useless for the decision you care about. The scaling is real. The ceiling is just low. You cannot see this from the curve, only from a separate estimate of the noise floor, which is why replicate experiments are worth more than they get credit for.

## Effective data is not nominal data

$D$ in the formula means independent samples. Biological corpora are not that, and not by a little.

UniProt is full of homologs. Expression atlases are dominated by a handful of model organisms and a few tissue types. Perturbation screens reuse the same cell lines. The nominal count is enormous and the effective count, after you cluster by sequence identity or by donor or by study, is often an order of magnitude smaller. Sometimes two.

So when a model trained on hundreds of millions of sequences underperforms its scaling prediction, the first thing to check is not the architecture. It is whether $D$ was ever what the fit assumed. Deduplicate at 50% identity and re-fit. The curve usually looks different and the honest version is less flattering.

## What Chinchilla actually said

The compute-optimal result is that for a fixed budget $C \approx 6ND$, the optimum has $N^\star$ and $D^\star$ both scaling as roughly $C^{1/2}$. Parameters and data should grow together.

The lesson most people took was "previous models were undertrained." The lesson that transfers is more interesting: data is a co-equal axis, and the optimum is a ratio, not a direction.

In a domain where $D$ is bounded by physical reality, by how many humans have been sequenced or how many proteins have been crystallized, you hit the data wall long before the parameter wall. Past that point, scaling $N$ does not just stop helping. It is negative value, because you are spending compute to overfit a bounded corpus more precisely.

The correct response to being data-bound is to spend on measurement. Better assays, more replicates, deliberate coverage of the parts of the space nobody has sampled. That is where the marginal value is, and almost nobody does it, because a model is a paper and a dataset is a resource, and the field prices those very differently.

## Loss is not capability

The curves are fit in loss. The thing anyone cares about is downstream behavior, and the map between them is neither linear nor monotone across tasks.

A small drop in loss can correspond to a large jump in a specific capability, which is where the emergence discourse comes from. It can also correspond to nothing at all on the task you need, because the loss is averaged over a distribution that weights your task at essentially zero. In a specialized domain that second case is the default, not the exception.

Which means a scaling curve is a statement about average compression of a corpus. It is evidence about capability only to the degree that the corpus resembles what you want. If your evaluation is cross-individual expression prediction and your corpus is reference genomes, the curve can look perfect while the capability you need never appears, because the corpus barely contains the signal.

## The bitter lesson, read carefully

The argument is that general methods leveraging computation outperform methods built on human knowledge of the domain. It is a claim about where to put your engineering effort as compute grows.

It is not a claim that data keeps arriving. It is not a claim that every domain has a corpus big enough for the general method to win. Search and learning scaled because compute scaled and, in the domains where the lesson was observed, data was either generated by self-play or already lying around on the internet in unlimited quantity.

Neither of those is true of a wet-lab measurement. You cannot self-play a binding affinity. You cannot scrape a patient cohort that nobody collected. In a domain where the binding constraint is measurement rather than compute, the bitter lesson gives you no guidance, and citing it as though it does is a way of avoiding the actual problem, which is that the data does not exist and somebody has to go make it.
