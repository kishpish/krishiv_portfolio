---
title: "Energy is a modeling choice, not a discovery"
description: "Turning a density into a landscape is a change of variables. What makes it science is the prediction you extract afterward, not the transformation itself."
tags: ["energy-based-models", "single-cell", "physics"]
section: "Models & objectives"
status: "note"
---

There is a move in computational biology that always gets described as a discovery. You estimate a density over cell states, declare it Boltzmann, and announce that you have recovered the energy landscape of differentiation.

The transformation is free. Given any strictly positive density $p$, define

$$E(x) \equiv -T \log p(x) + c$$

and you are done. It works for every density, including densities with no physics behind them at all. Do this to a histogram of house prices and you get an energy landscape of house prices. Nothing has been found. A logarithm has been applied.

So the interesting question is never whether you can write $E$. It is what you are entitled to claim once you have.

## The claim that carries the weight

The real assertion is not about the density. It is about dynamics. When people say landscape, they mean the system evolves as overdamped Langevin motion down that surface:

$$dx = -\nabla E(x)\,dt + \sqrt{2T}\,dW$$

whose stationary distribution is $p \propto e^{-E/T}$. That is the load-bearing step, because it says the *same* function governs two different things: where the system sits, and how it moves. The density only tells you about the first. The dynamical claim is what lets you say anything about the second, and the second is where all the useful predictions live.

It is also, for cells, false.

Helmholtz lets you split any velocity field into a gradient part and a divergence-free part:

$$v = -\nabla E + v_{\text{curl}}, \qquad \nabla \cdot v_{\text{curl}} = 0$$

A system at thermodynamic equilibrium has $v_{\text{curl}} = 0$ and detailed balance holds. Cells proliferate, die, and differentiate in one direction. There is throughput. There are limit cycles in the cell cycle, which are by definition rotational. The curl term is not small and it is not noise. It is the part of the biology that makes it alive, and the landscape construction throws it on the floor.

I want to be clear that I think the construction is still worth doing. I just think the honest framing is different from the usual one.

## Why it works anyway

Because the equilibrium assumption is not what you test. You test what it predicts.

Once you have $E$, you can compute things the density alone cannot give you. Barrier heights between basins. Mean first passage time, which through Kramers' escape rate goes as

$$\tau \approx \tau_0\, e^{\Delta E / T}$$

and is exponentially sensitive to the barrier, so it is a sharp prediction rather than a soft one. The committor $q(x)$, the probability of reaching basin $B$ before basin $A$ starting from $x$, which solves

$$-\nabla E \cdot \nabla q + T \nabla^2 q = 0$$

with $q = 0$ on $\partial A$ and $q = 1$ on $\partial B$. These are numbers. They can be wrong.

When I fit this to acute myeloid leukemia and gave 79 cell states a basin depth, a passage time, and a committor, the test was not whether cells obey detailed balance. It was whether the ranking of states by landscape geometry lined up with drug response measured independently, with no supervision connecting the two. Monocytic states coming out sensitive to MEK and HDAC inhibition at $\rho = -0.42$, primitive states sensitive to BCL2 inhibition, and 40 of 40 evaluable signatures reproducing in a separate atlas of 748,679 cells. The equilibrium assumption is wrong and the derived quantities still carry signal. That is a normal situation in physics and it should be a normal situation here.

The right way to say it: the landscape is a coarse-graining that discards the rotational component, and it recovers real structure in the part it keeps. That sentence is less exciting than "we recovered the energy landscape of leukemia." It is also the one I can defend.

## The question I would ask any landscape paper

What does the landscape predict that the density does not?

If the answer is a picture where the basins are labeled with cell types already known from clustering, no information was added. The valleys are the modes. The modes came from the clustering. You applied a logarithm and inverted the colormap.

If the answer is a barrier height that forecasts which transition is reversible, or a passage time that says which population regrows after treatment, or a committor that flags cells already committed to a fate their expression has not caught up to, then the extra structure earned its place.

Temperature is the other thing nobody wants to discuss. $T$ in a single-cell landscape is not a temperature. It is a free scale parameter that multiplies every energy and sits in the exponent of every rate. Fix it by convention and your barriers are in arbitrary units, which is fine for ranking and useless for absolute claims. State the convention. Compare within a dataset. Do not report a barrier in $k_B T$ as though it meant what it means in a protein folding paper.

The landscape is a good abstraction. It is an abstraction that has to pay rent, and the rent is a falsifiable number.
