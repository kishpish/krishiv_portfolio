---
title: "Inductive bias is a budget"
description: "Architecture, loss, and data are three places to put a constraint. They are not interchangeable, and the choice follows from whether the constraint is exactly true."
tags: ["physics-informed", "inductive-bias", "architecture"]
section: "Models & objectives"
status: "note"
---

Physics-informed machine learning gets discussed as one technique. It is three, and they differ in a way that decides whether the project works.

You can put a constraint in the architecture, so the model cannot violate it. You can put it in the loss, so violations are expensive. You can put it in the data, by augmenting until the model infers it. Papers tend to pick one by habit. The choice should follow from a single question: is the constraint exactly true.

## The three placements

**Architecture.** The constraint holds identically, for every input, including inputs far from anything you trained on. It costs nothing at inference and it shrinks the hypothesis class, which lowers estimation error. Equivariant networks satisfying $f(g \cdot x) = \rho(g) f(x)$ live here. So do symplectic integrators, and the port-Hamiltonian parameterization where skew-symmetry of $J$ makes $\nabla H^\top J \nabla H$ vanish algebraically rather than numerically.

The cost is expressiveness and implementation pain. Constrained layers are harder to write, harder to debug, and frequently slower per step.

**Loss.** Add a residual penalty:

$$\mathcal{L} = \mathcal{L}_{\text{data}} + \lambda\,\big\lVert \mathcal{N}[u_\theta] \big\rVert^2$$

Cheap, general, applies to any differentiable constraint. The constraint is satisfied approximately, at the points you sampled, to the degree $\lambda$ buys against the data term.

That $\lambda$ deserves more suspicion than it gets. It is a statement that you believe the physics *this much* relative to the data. If the physics is exactly true, any finite $\lambda$ is admitting you will accept violations when the data pushes hard enough. The tuning process, where $\lambda$ gets lowered until training stabilizes, is frequently the process of quietly turning the physics off while keeping the word "physics-informed" in the title.

**Data.** Augment with transformed copies and let the model infer the invariance. Approximate, sample-inefficient, scales with your data budget, and composes with absolutely anything, which is why it never goes away.

## A rule

Exact and cheap to enforce goes in the architecture. Exact but expensive or awkward to enforce goes in the loss. Approximate goes in the data.

The reason the first clause matters: a hard constraint defines a restricted hypothesis class $\mathcal{H}_{\text{eq}} \subset \mathcal{H}$. Estimation error falls because there is less to fit. Approximation error rises if the true function is not in $\mathcal{H}_{\text{eq}}$. The trade is favorable only when the symmetry is genuinely exact.

When it is approximately true, hard constraints actively hurt, and this is where people get burned. Proteins are chiral, so imposing full $\mathrm{O}(3)$ equivariance is wrong; mirror images of a binding site are not equivalent and a model that insists they are has been handed a false fact. $\mathrm{SE}(3)$ is right. Translation invariance in genomic sequence is wrong near a transcription start site where absolute position carries information. Permutation invariance over cells is wrong if the ordering encodes pseudotime.

The failure mode of a wrong architectural constraint is nasty because it is silent. A soft constraint that is wrong shows up as a loss term that will not come down. A hard constraint that is wrong shows up as a model that confidently cannot express the truth and never complains, and you find out from a test set, if you are lucky, or from a wet lab, if you are not.

## Where I think most PINN failures come from

A constraint that should have been architectural got implemented as a loss term, and then $\lambda$ was tuned until the physics stopped mattering.

Symptoms: the physics loss plateaus orders of magnitude above the data loss; results barely change when $\lambda$ moves over two decades; the model violates conservation visibly at the boundaries. All three say the constraint is not being enforced, it is being gestured at.

Sometimes the honest answer is that the physics does not belong in the model at all. If your governing equation is a simplification you do not fully trust, forcing a network to satisfy it means teaching the network your simplification's errors. Better to let the data speak and use the physics as a diagnostic afterward, checking conservation on predictions instead of imposing it during fitting.

## The budget framing

Every constraint you impose spends capacity. The question is whether you get it back.

Imposing something exactly true buys sample efficiency, which is the single most valuable currency in a domain where data is bounded by how many experiments someone ran. An equivariant model trained on a thousand structures can beat an unconstrained one trained on ten thousand, and in a domain where ten thousand does not exist, that is the whole game.

Imposing something approximately true costs you capacity and gives back a bias you cannot measure. Which is worse than doing nothing, because doing nothing at least leaves the error visible in the loss.
