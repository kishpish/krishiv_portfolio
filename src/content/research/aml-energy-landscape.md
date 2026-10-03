---
title: "An empirical energy landscape of acute myeloid leukemia"
short: "Leukemia landscape"
order: 4
period: "2026"
role: "First author, with M. Yurukcu"
kind: independent
paper: aml-icbbs-2026
summary: >-
  Single-cell atlases label leukemic cell states but say nothing about how
  stable a state is or what it takes to leave one, which is exactly what
  matters for the rare populations that drive relapse. Training a score network
  under the constraint that its field be the gradient of a single scalar
  potential turns 38,193 cells into a landscape with four attractors and two
  saddles, with basin depth, mean first-passage time, and a committor computed
  for 46 of 79 catalogued states. Deconvolving those state signatures into Beat
  AML bulk expression recovers drug associations under no drug supervision,
  trametinib at ρ = −0.42 over 484 samples. A named state is then queryable
  for quantities a cluster label cannot give: each cell assigned to a basin by
  its own deterministic flow, a numeric barrier for all six ordered attractor
  pairs, and 38,224 scored state-drug pairs narrowed to 221 over 86 compounds,
  small enough for one validation screen.
problem: >-
  Single-cell atlases name cell states. They do not say how stable a state is,
  what it would take to leave it, or where it would go. The rare leukemic stem
  cells that drive relapse are exactly the states where that distinction
  matters, and they are also the states a clustering algorithm is least able to
  resolve, because a hundred of them are outvoted by ten thousand ordinary
  blasts.
approach: >-
  Model the density of cells in transcriptomic space as Boltzmann-like, so that
  a density becomes a potential, and train a score network whose score field is
  the gradient of a single scalar potential. That constraint is what makes the
  surface a landscape rather than a picture: a conservative field has basins,
  saddles, and barriers you can actually compute. Then take the derived
  quantities seriously as predictions: basin depth, mean first-passage time,
  and a committor for each state.
result: >-
  Four attractors and two saddles on the learned surface, 79 cell states
  catalogued, and landscape fingerprints computed directly for the 46 states
  with enough cells to support them. The test was not whether cells obey
  detailed balance, which they do not. It was whether the structure recovered
  without any drug supervision lines up with drug response measured
  independently.
landscape: >-
  Here the landscape is the object being recovered. A drug becomes a force that
  changes the shape of a basin, rather than a label attached to a cluster.
headline: "38,193 cells"
evidence:
  - value: "38,193"
    label: "cells, 16 AML patients and 5 healthy donors"
  - value: "79"
    label: "cell states catalogued, 46 with computed fingerprints"
  - value: "ρ = −0.42"
    label: "strongest drug association, MEK inhibition, n = 484"
  - value: "748,679"
    label: "cells in the validation atlas"
abstract_kind: summary
abstract: >-
    Single-cell atlases name leukemic cell states but say nothing about how stable a state is or
    what it costs to leave one, which is the question that matters for the rare populations
    behind relapse. This work fits an explicit energy landscape to acute myeloid leukemia
    single-cell data, healthy donors included. A neural network learns a scalar potential and
    the dynamics are its negative gradient, so the field is conservative by construction and a
    barrier height does not depend on the path taken to measure it. Critical points come from
    many trial trajectories, and each cell is assigned to the attractor its deterministic flow
    descends to. Across 38,193 cells the landscape has four attractors and two saddles, and drug
    action is modelled as a constant force that tilts the potential. With no drug supervision,
    deconvolving the state signatures into bulk expression recovers a known response split, with
    monocytic states tracking MEK sensitivity and venetoclax resistance. The landscape's own
    mechanistic predictions did not work: basin escape failed to beat background, and basin
    depth does not predict which states persist after treatment.
plate:
  source: Figure 1(a)
  caption: >-
    38,193 single cells, coloured by which basin of the learned landscape each
    one falls into under the deterministic flow. Four attractors come out of the
    data: mature myeloid (A0), primitive and stem-like (A1), lymphoid (A2), and
    erythroid (A3). The basins are not equally deep, which is the quantity the
    whole project is about. Their depths are 0.179, 0.225, 0.364 and 0.243
    respectively, so a cell sitting in the lymphoid basin is held far more
    firmly than one in the mature myeloid basin, and that is a statement about
    how hard each state is to leave.
  panels:
    - src: "/media/fig-aml"
      width: 800
      height: 685
      fallback: png
      alt: >-
        UMAP of 38,193 single cells coloured by which of the four learned basins
        each one falls into, with the mature myeloid basin in red and the
        primitive and stem-like basin in blue.
thumb:
  src: "/media/fig-aml"
  width: 800
  height: 685
  fallback: png
  alt: >-
    UMAP of 38,193 single cells coloured by which of the four learned basins each one falls into, with the mature myeloid basin in red and the primitive and stem-like basin in blue.
  # The UMAP ships on a white canvas, two thirds of the image, so it belongs in
  # the contain treatment where that canvas multiplies into the window. Cover
  # cropped it and left the white standing, which put the one white rectangle
  # left on the site back on the home page.
  fit: contain
links: []
related:
  - energy-is-a-modeling-choice
  - what-the-score-function-actually-buys-you
  - confidence-is-not-correctness
---

## Why a landscape and not a UMAP

Writing a density as an energy is free. Given any strictly positive density
$p$, set

$$E(x) = -T \log p(x) + c$$

and you have a landscape. That transformation applies to a histogram of house
prices just as well, and nothing has been discovered. I have a whole note
arguing this point, and I would rather state it here than let the figure imply
otherwise.

What is not free is the constraint. The network is trained so that its score
field is the gradient of one scalar function, which makes the field
conservative. A conservative field is what lets you ask for a barrier height
between two basins and get an answer that does not depend on the path you took
to ask. An unconstrained score network will happily produce a field with
curl in it, and then "barrier" means nothing.

The equilibrium assumption underneath all of this is also wrong for cells.
Cells proliferate, die, and differentiate in one direction. There is
throughput, and the cell cycle is a limit cycle, which is rotational by
definition. Helmholtz lets you split any velocity field into a gradient part
and a divergence-free part, and this construction keeps the first and discards
the second. The honest framing is that the landscape is a coarse-graining that
throws away the rotational component and recovers real structure in what is
left.

## What the fingerprints are, and what they are not

Each state gets three numbers:

| quantity | what it is | how it was computed |
| --- | --- | --- |
| basin depth | potential at the state's centroid relative to its basin's attractor | direct evaluation of the learned potential |
| first-passage time | mean time to reach a target attractor | Langevin trajectories from seed cells |
| committor | fraction of trajectories ending nearest a target basin | the same trajectories, scored at the horizon |

Two caveats that belong next to those numbers rather than in a supplement. The
committor here is a final-state proxy, scored at a fixed horizon rather than on
first arrival, and a large share of trajectories never reach any attractor
inside that horizon. And the potential is in the model's own units. It is not
$k_BT$, it is not kcal/mol, and quoting it as though it were would be the kind
of borrowed authority this whole approach is supposed to avoid. Barriers are
comparable within this dataset and nowhere else.

The fingerprints are computed directly for 46 of the 79 states. The remaining
33 have too few real cells to support their own trajectory estimates and carry
their basin's averages instead, which is a fact about sample size, not a
result.

## The test

The states were defined without any drug data. The drug data was brought in
afterwards: state signatures were deconvolved into Beat AML bulk expression,
and the resulting per-sample state fractions were correlated against ex vivo
drug response.

Nothing in that chain is supervised by the outcome, which is what makes it a
test. The strongest association across 6,200 state-by-drug comparisons is a
dendritic-like state in the monocytic basin against trametinib, a MEK
inhibitor, at $\rho = -0.42$ over 484 patient samples. Venetoclax runs the
other way in the same basin, at $\rho = +0.56$: the monocytic states are
associated with resistance to BCL2 inhibition, and the primitive states with
sensitivity to it. That split is a known feature of AML biology, and it falls
out of a structure built without being told about it.

## What did not work

Three things, which belong on this page as much as the result does.

The landscape-based drug predictions, the ones that go through perturbation
signatures and basin escape rather than through deconvolution, did not beat
background. Synthetic cells sampled from the learned dynamics did not improve
marker recovery for rare states over using the real cells alone, which was the
original reason to build the generator. And basin depth does not predict which
states persist after treatment: the correlation is 0.05 with a p-value of 0.74.

The association result stands and the mechanism story around it does not, yet.
I would rather say that here than let the figure carry an implication the
analysis does not support.

## Validation, and its two limits

The 40 evaluable state signatures were tested against a 748,679-cell AML atlas.
All 40 reach significant enrichment there, but that is the weakest version of
the test: with three quarters of a million cells, a one-sided comparison of the
best-matching cell type against everything else is close to automatic. Exact
cell-type reproduction is 20 of 40, and broad lineage is 34 of 40. Those are the
numbers I would quote in a talk.

The second limit is the one that matters more, and I would rather state it than
let a reader assume otherwise. That atlas is an integration of twenty published
studies, and one of them is the study these cells were trained on. So the
training data sits inside the set the signatures were checked against. That
makes this a reproduction check, which is still worth running, and not an
independent replication, which is what the word validation usually implies.
Doing it properly means rebuilding the comparison with the source study held
out, and that is work I have not done yet.
