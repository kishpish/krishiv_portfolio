---
title: "De novo protein inhibitors for a β-lactamase"
short: "Protein inhibitors"
order: 3
period: "Jun 2024 to Jan 2025"
role: "First author"
kind: independent
paper: tem171-biorxiv-2025
honor: "Regeneron ISEF 2025 Finalist"
question: "Can a protein be designed to jam a bacterial enzyme, and can you tell whether it will hold on before anyone makes it?"
problem: >-
  TEM-171 is a β-lactamase: an enzyme that lets bacteria destroy an extended
  range of β-lactam antibiotics. Resistance evolves around small-molecule
  inhibitors quickly. A protein inhibitor is a harder target to evolve away
  from, and designing one normally takes years of wet-lab iteration.
approach: >-
  A pipeline that generates candidate binders and then makes them earn it.
  Backbones from a diffusion model, sequences from an inverse-folding model,
  interface refinement, structure prediction for the complex, and then the part
  that actually tests the design: steered molecular dynamics that pulls the
  binder off its target while measuring force, and free-energy calculation
  along that pulling coordinate.
result: >-
  The published pipeline reports 94% of designs forming stable interfaces at
  38.4 seconds per design, with a binding free energy of −12.3 kcal/mol for the
  selected inhibitor and peak unbinding forces above the range typical of
  protein-protein complexes. Nothing in the pipeline is specific to TEM-171, so
  it can be pointed at another target.
landscape: >-
  Validation here is literally a landscape traversal with a measured price: the
  potential of mean force along the unbinding coordinate is the barrier the
  design has to defend.
headline: "94% stable"
evidence:
  - value: "94%"
    label: "of designs form stable interfaces (i_pTM > 0.8)"
  - value: "38.4 s"
    label: "average compute per design"
  - value: "−12.3"
    label: "kcal/mol binding free energy, selected design"
  - value: "2,048"
    label: "scaffolds generated, 67 refined at the interface"
media:
  src: /media/binder-generation
  poster: /media/binder-generation.png
  caption: >-
    One binder being generated against the target, played at roughly eight
    times real compute time. The target is the fixed structure on the left;
    the helical binder is the part being built. Colour is the model's
    per-residue confidence, running from warm and uncertain at the start to
    cool and confident once the fold has settled. This is a frame capture from
    the generation stage of the pipeline, in the project repository.
  alt: >-
    An animation of protein design. A fixed target protein sits on the left as
    a compact blue fold. A long helical binder grows out to the right, changing
    colour from red and orange to green and blue as the model becomes more
    confident in the structure it is building.
figure:
  id: tem171-funnel
  caption: >-
    The refinement stage of the search, as logged in the repository. Each point
    is one interface-design trajectory, placed by the confidence of the
    predicted complex and by its computed interface energy. Trajectories above
    the dashed line clear the interface-confidence bar the pipeline filters on.
    This is the funnel rather than the output: it shows what the search had to
    chew through to find candidates worth simulating, and the corner you want is
    the top left, where high confidence meets favourable interface energy.
  alt: >-
    Scatter plot of 60 interface-design trajectories. The horizontal axis is
    interface energy, more negative to the left, and the vertical axis is
    predicted interface confidence from zero to one. A dashed horizontal line
    marks the 0.8 confidence threshold. Points are spread widely, with a cluster
    of high-confidence designs in the upper portion.
links:
  - { label: preprint, href: "https://www.biorxiv.org/content/10.1101/2025.06.23.661177v1" }
  - { label: code, href: "https://github.com/kishpish/tem171-inhibitor-pipeline" }
  - { label: ISEF project, href: "https://isef.net/project/cbio021-tem171-inhibitor-design-via-deep-learning-pipeline" }
related:
  - confidence-is-not-correctness
  - protein-language-models-have-a-units-problem
---

## The active site, and why it constrains everything

Two crystal structures anchored the design: a form with an existing inhibitor
bound, and the unbound form that became the design template. From those, nine
residues were defined as the target. Four are catalytic, including the
nucleophilic serine the enzyme uses to open a β-lactam ring. Five more hold the
pocket's shape or stabilize a bound inhibitor.

Those nine residues are the hotspot the generated binders were directed at. A
binder that sits elsewhere on the surface may fold beautifully and do nothing,
which is why the hotspot specification matters more than almost any other
parameter in the pipeline.

## Generate, then disbelieve

The generation half is the part people find interesting and the part I trust
least on its own. Scaffolds come from a diffusion model conditioned on the
hotspot, sequences come from an inverse-folding model, and an interface
refinement loop optimizes the designs against structure-prediction confidence.

The problem is that every one of those stages reports a confidence, and
optimizing against a confidence is the fastest way to a design that is
confidently wrong. Interface predicted-TM and predicted aligned error are
trained quantities. They are correlated with correctness and they are not
correctness, and the gap between those two statements widens exactly when you
start optimizing against them, which is the whole argument of one of my notes.

So the pipeline treats the generated confidence as a filter, not as evidence,
and spends its real compute on physics.

## What the simulation actually measures

Steered molecular dynamics attaches a stiff spring to the binder and pulls it
away from the target at a controlled rate, recording the force needed. The
force-displacement trace is readable as a mechanism: elastic deformation at the
interface, then sequential contact rupture, then separation. Peak unbinding
forces in the published runs exceed the 800 to 1,200 kN/mol range typical of
protein-protein complexes.

Pulling is non-equilibrium work, so it does not give a free energy directly.
The Jarzynski equality relates the exponential average of that work to the
equilibrium free energy difference, which is how the pulling traces become a
potential of mean force:

$$e^{-\Delta G / k_B T} = \left\langle e^{-W / k_B T} \right\rangle$$

The resulting profile has a single deep minimum at −12.3 kcal/mol with a smooth
approach and no competing local minima, and the complex holds its contacts
with the catalytic serine across a physiological pH and temperature range.

A smooth funnel with one minimum is the shape you want. A profile with
intermediate wells would mean the binder has more than one way to sit on the
target, and a design with two binding modes is a design you cannot reason about.

## What this does not claim

It is computational, end to end. No binder here has been expressed, purified,
or assayed, and the free energies are simulation estimates with all the force
field dependence that implies. What the work establishes is a pipeline that
makes the expensive part of a design decision cheap enough to do thousands of
times, and that is target-agnostic enough to point somewhere else tomorrow.
