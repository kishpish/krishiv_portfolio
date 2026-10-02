---
title: "Confidence is not correctness"
description: "ipTM and pLDDT are the most load-bearing numbers in computational protein design, and they are self-reports from a model evaluated outside its training distribution."
tags: ["protein-design", "evaluation", "calibration"]
section: "Methods & evaluation"
status: "note"
---

In my inhibitor design work, 94% of generated designs produced predicted interfaces with ipTM above 0.8, at 38.4 seconds per design. I report that number because it is the honest description of what the pipeline does. I want to be precise about what it is not, because the distinction gets lost constantly and I have seen the looser version of this claim made by people who should know better.

It is a filter pass rate. It is not a success rate. Those differ by the entire question of whether the confidence metric means anything on designed sequences.

## What ipTM is predicting

TM-score measures structural agreement between a predicted structure and a true one. ipTM is a *prediction* of what that score would be at the interface, produced by the same network making the structural prediction. It is the model estimating its own agreement with ground truth.

For a protein in the PDB that is a sensible thing to estimate, and it is well calibrated, because the model was trained on exactly that distribution and the ground truth exists. For a complex that has never been synthesized, there is no true structure to agree with. The model is estimating its agreement with an object that does not exist.

What it is actually reporting is something closer to: this arrangement resembles complexes I was trained on. For designed binders that correlation is not worthless. Designable interfaces tend to be idealized, well-packed, and hydrophobically sensible, which is also what high-confidence natural interfaces look like. The signal is real.

It is also exactly why it breaks under optimization. If your generator is selected against ipTM, you are running gradient ascent on "looks like the training distribution." The sequences that survive are the ones that most resemble PDB complexes, which is correlated with binding right up until the correlation is the thing being exploited.

Goodhart's law has a clean statement in this setting: a confidence metric optimized against stops measuring confidence and starts measuring proximity to the training manifold.

## The calibration argument, stated properly

Calibration is a property of a model and a distribution together, never of a model alone. The usual estimator:

$$\mathrm{ECE} = \sum_{b=1}^{B} \frac{|B_b|}{n}\,\big|\,\mathrm{acc}(B_b) - \mathrm{conf}(B_b)\,\big|$$

A structure predictor can have excellent ECE on held-out PDB complexes and tell you nothing about its ECE on your generated set, because your generated set is drawn from a different distribution. Worse, it is drawn from a distribution *you constructed by selecting for high confidence*. The shift is not incidental. It is adversarial, and you are the adversary.

This is the part that should make people uncomfortable. Ordinary distribution shift degrades calibration in whatever direction the data happens to move. Selection-induced shift degrades it in the single worst direction, concentrating your test set precisely where the model is overconfident, because overconfidence is what your filter selected for.

## What orthogonal validation is actually for

The standard answer is to follow the neural prediction with molecular dynamics and free-energy calculation. Steered MD to pull the complex apart, then Jarzynski to extract the free energy difference from the nonequilibrium work:

$$e^{-\beta \Delta F} = \big\langle e^{-\beta W} \big\rangle$$

The usual justification is that physics is more trustworthy than a neural network. I do not think that is the real argument, and I think stating it that way invites a bad counterargument, which is that force fields are themselves approximate and MD on a design has its own failure modes. True.

The argument that actually holds is about error correlation. Let $\epsilon_{\text{net}}$ be the structure predictor's error and $\epsilon_{\text{md}}$ the simulation's. Neither is small. What matters is that they come from unrelated sources: one from a learned prior over deposited structures, the other from a parameterized potential and a sampling procedure. If $\mathrm{Corr}(\epsilon_{\text{net}}, \epsilon_{\text{md}}) \approx 0$, then agreement between them is informative in a way that neither is alone, and a design that passes both is far less likely to be an artifact of either.

A second network trained on the same PDB would not do this. Its errors are correlated with the first one's by construction, and stacking it on top gives you a number that looks like independent confirmation and is not. That is the actual case for multi-scale validation, and it is rarely the case people make.

## What I would want reported

Two numbers, never one. The filter pass rate, which tells you about the generator's yield. The orthogonal pass rate, which tells you about the designs. State them separately and say which metric each used.

And when someone shows a figure where a confidence metric is both the optimization objective and the reported outcome, the right question is simply: what else did you check. If the answer is nothing, the figure is reporting how hard the optimizer tried.
