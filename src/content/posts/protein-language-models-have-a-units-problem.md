---
title: "Protein language models have a units problem"
description: "A sequence model learns a distribution over strings evolution happened to keep. Function depends on quantities that never appear in the input, and no amount of scale conjures them."
tags: ["protein-language-models", "foundation-models", "state-of-the-field"]
section: "State of the field"
status: "note"
---

The language analogy got proteins a long way. Treat a sequence as a sentence, train a masked or autoregressive objective on a few hundred million of them, and you get representations that transfer to structure, stability, and contact prediction. That worked better than anyone expected and it is a legitimate result.

The analogy has now started costing more than it returns, and the reason is a units problem.

## What the model is a model of

A protein language model trained on UniProt learns $p(\text{sequence})$ over the sequences that exist in a database. That database is a survivorship-weighted sample of what evolution retained in organisms somebody sequenced. It is not a sample of possible proteins and it is not a sample of functional proteins.

So high likelihood under a PLM means: this looks like something evolution kept. Which correlates with foldable, stable, and not immediately lethal, because those are preconditions for being kept. That correlation is genuinely useful and it explains most of what PLMs do well.

It is also a much narrower statement than "the model understands proteins," and the gap shows up exactly where people want to use these models for design, which is in regions of sequence space evolution never explored, where the training distribution has nothing to say.

## The variables that are not in the input

Protein function is a rate problem. Binding is a $K_d$, which is a ratio of rates, which depends on concentrations. Enzyme behavior is $k_{\text{cat}}/K_M$ under a pH and a temperature. Folding competes with aggregation, and which wins depends on how fast the protein is being made and what chaperones are around.

None of these are in a sequence. Not the concentration, not the temperature, not the pH, not the binding partners, not the post-translational modifications, not the subcellular compartment, not the time.

A model that never observes concentration cannot represent a dissociation constant. That is not a capability that emerges at scale. It is a variable missing from the input, and you can make the model arbitrarily large without it appearing.

What the model can learn is the marginal: the typical behavior of sequences like this one, averaged over all the unrecorded conditions in the training set. Often that marginal is informative. It is still a marginal, and the thing you want in a design loop is a conditional.

## Variant effect prediction, examined

The flagship zero-shot result is scoring mutations by likelihood ratio:

$$s = \log p_\theta\big(x^{\text{mut}}\big) - \log p_\theta\big(x^{\text{wt}}\big)$$

This correlates with deep mutational scanning data across many proteins. The correlation is real and reproducible.

What is it measuring. A position where every homolog in the training data carries the same residue has low likelihood for substitutions, so $s$ is strongly negative. That is a conservation score, computed by a neural network instead of an alignment. It is a better conservation score than a PSSM because the model captures higher-order couplings, but it is the same quantity.

Which tells you where it fails, and the failure is systematic rather than random. Conservation predicts whether a mutation is bad. It says nothing about mutations that are *good* in a way evolution had no reason to select for, because there was no selection pressure to leave a signature. Gain of function, thermostabilization beyond the organism's growth temperature, altered specificity toward a non-natural substrate: these are the cases where design is interesting, and they are precisely the cases where the evolutionary prior is uninformative or actively wrong.

So the benchmark correlation is high and the design utility is low, for the same reason. The benchmark is dominated by loss-of-function mutations at conserved sites, which is the easy regime.

## What would actually help

Conditioning on the missing variables. Which means paired data: sequence plus the measurement, plus the conditions under which the measurement was taken. Train on that and you can learn a conditional rather than a marginal.

That data is expensive. It comes from wet labs, in dataset sizes measured in thousands rather than hundreds of millions, under conditions that vary between labs in ways nobody records carefully. The combination of small, heterogeneous, and expensive is the opposite of what pretraining wants.

Which is why the field keeps reaching for scale instead. Scale is available, buyable, and the curves look good. It is the wrong axis and it is the one with a credit card attached.

## On the metaphor

Language has semantics inside the string. "The cat sat on the mat" means what it means because of the tokens and their arrangement, and a sufficiently good model of token sequences can get at the meaning, because the meaning is in there.

A protein sequence specifies a structure, and the structure plus an environment determines a function. The environment is not in the string. Calling the model a language model implies the semantics are recoverable from the sequence alone, and for the questions people now want answered, they are not.

The name was a good bet when the question was structure. It is a misleading one now that the question is function, and the field would be clearer about its own limits if it stopped reaching for the comparison.
