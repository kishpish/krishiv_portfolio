---
title: "Inverse design of cardiac-repair biomaterials"
short: "Cardiac biomaterials"
order: 2
period: "May 2025 to Feb 2026"
role: "First author"
kind: independent
paper: hydrogel-urtc-2026
honor: "1st Place, Texas Science and Engineering Fair 2026"
summary: >-
  Scar replaces muscle permanently after a heart attack, and the gel you would
  inject interacts with the geometry of one patient's damage, so the experiment
  you actually want is the one you cannot run. This work pairs a pretrained
  polymer chemical language model with a geometry pipeline that turns patient
  surface meshes into ten solver-ready tetrahedral hearts totalling 3.66
  million elements, each carrying fibre architecture and a scar and border zone
  inferred from wall thinning. Candidates are scored against outcome and safety
  thresholds fixed in code, which turns an open-ended material search into a
  ranked shortlist. Because the search runs on surrogate predictions rather
  than a full simulation per design, a shortlisted formulation is a hypothesis
  for the solver rather than a result from it.
problem: >-
  Scar replaces muscle permanently after a myocardial infarction. An injectable
  hydrogel could support the wall while the tissue remodels, but a gel is not
  one thing: stiffness, degradation rate, conductivity, thickness, and where you
  put it all interact with the geometry of one patient's damage. Matching a
  material to a heart is years of trial and error, and the one test you want,
  trying it on that patient, is the one you cannot run.
approach: >-
  Close the loop in silico. On one side, a chemical language model fine-tuned
  from a pretrained polymer model proposes and scores formulations across the
  design space. On the other, a geometry pipeline turns each patient's surface
  meshes into a tetrahedral heart with inferred scar, border zone, transmural
  coordinates, and helical fibre architecture, ready for mechanical and
  electrophysiology solvers. A design is only a candidate if it clears
  thresholds on both sides.
result: >-
  Ten patient-specific hearts built end to end, 3.66 million tetrahedral
  elements across them, with scar and border zone labelled automatically from
  wall geometry, fibre fields reconstructed, and injection sites selected
  geodesically. Designs are scored against a therapeutic bar set at a 5-point
  absolute improvement in ejection fraction, with wall-stress and strain
  criteria alongside it and explicit safety limits.
landscape: >-
  This one is a search rather than a trajectory: a design space with a scoring
  surface over it, and the question is which point moves a patient from one
  state to a better one.
headline: "3.66M elements"
evidence:
  - value: "10"
    label: "patient-specific heart models built end to end"
  - value: "3.66M"
    label: "tetrahedral elements across the ten meshes"
  - value: "24"
    label: "hydrogel formulations across the searched design space"
  - value: "16× A100"
    label: "distributed training configuration"
plate:
  source: Figure 2
  caption: >-
    Patient-specific tissue classification, which is the input every injection
    site is scored against. Healthy myocardium, border zone and core scar are
    assigned per element from wall thinning along a computed transmural
    coordinate, fibre coherence, and anatomical constraints, rather than read
    off contrast-enhanced imaging. The border zone is the tissue the patch is
    aimed at, so where it begins and how deep it runs is the whole question.
  panels:
    - src: "/media/fig-cardiac"
      width: 800
      height: 395
      fallback: png
      label: a
      title: Global tissue classification
      alt: >-
        Three-dimensional patient-specific left-ventricle mesh coloured by
        tissue type, with healthy myocardium in blue, the border zone in green
        and yellow, and the core infarct scar in red.
    - src: "/media/fig-cardiac-b"
      width: 1200
      height: 594
      fallback: jpg
      label: b
      title: Apical infarct and border zone transition
      alt: >-
        Magnified view of the apex, where healthy myocardium meets infarct. The
        border zone shows visible wall thinning and a sharp change in curvature
        at the scar boundary.
    - src: "/media/fig-cardiac-c"
      width: 1200
      height: 540
      fallback: jpg
      label: c
      title: Transmural extent of the scar
      alt: >-
        Longitudinal cross-section through the same heart, showing how far the
        scar and border zone run through the thickness of the wall rather than
        only across its surface.
thumb:
  src: "/media/fig-cardiac"
  width: 800
  height: 395
  fallback: png
  alt: >-
    Three-dimensional patient-specific left-ventricle mesh coloured by tissue type, with healthy myocardium in blue, the border zone in green and yellow, and the core infarct scar in red.
  fit: cover
links: []
related:
  - reward-is-a-bad-interface-for-design
  - inductive-bias-is-a-budget
  - the-bottleneck-was-never-the-gpus
---

## The half of this project that is geometry

Most of the difficulty is not the model. It is getting from a surface mesh to
something a finite-element solver and a cardiac electrophysiology solver will
both accept, for ten different hearts, without hand-editing each one.

The steps that mattered:

**A transmural coordinate.** Solving Laplace's equation with the endocardium
and epicardium as Dirichlet boundaries gives every element a smooth depth
through the wall, from 0 at the inner surface to 1 at the outer. Almost
everything downstream is expressed in that coordinate rather than in raw
geometry, which is what makes the rules portable between patients.

**Scar without contrast imaging.** Infarct and border zone are inferred from
wall thinning along that coordinate, combined with fibre coherence, a
Laplace-law stress estimate, and anatomical constraints. This is the step I
would flag first to a reviewer: it is inference from shape, not imaged scar,
and the detector is bounded to a plausible infarct fraction, so it cannot be
read as an independent measurement of how much damage a patient has.

**Fibre architecture.** Myocardium is not isotropic, and a mechanical model
that ignores that is not modelling a heart. Helix angles are assigned as a
function of transmural depth, running about −60° to +60° from epicardium to
endocardium, which is the standard rule-based construction.

**Where to inject.** Injection sites are chosen geodesically on the mesh
surface relative to the tagged region, one or two per patient, so the choice is
a consequence of that patient's damage rather than a fixed anatomical
convention.

## The half that is a model

The generative side fine-tunes a pretrained polymer chemical language model
with low-rank adapters, adds a fusion transformer over the material and patient
descriptors, and multi-task heads for the outcome and safety predictions. The
base model is frozen; what is learned is the adaptation and the heads.

The design space is 24 formulations crossed with stiffness, degradation time,
conductivity, thickness, and coverage, sampled broadly per patient and
filtered down to a shortlist.

## What "clinically meaningful" means here, precisely

It is a threshold in code, not a judgement call. A design is only labelled
therapeutic if it clears all of:

| criterion | bar |
| --- | --- |
| ejection fraction | ≥ 5 percentage points absolute improvement |
| wall stress | ≥ 25% reduction |
| strain normalization | ≥ 15% |
| toxicity, structural integrity, arrhythmia, rupture, fibrosis | within explicit safety limits |

Stating it that way matters, because "clinically meaningful improvement" is a
phrase that sounds like a measured outcome and is actually a bar somebody chose.
I chose this one, from the convention that a 5-point absolute gain in ejection
fraction is the smallest change usually treated as clinically relevant.

## Where I would push back on my own project

The pipeline's two halves are not yet as tightly coupled as the framing
suggests. The geometry side is real solver plumbing with real meshes. The
scoring side, in the configuration published in the repositories, leans on
surrogate predictions rather than running a full mechanical simulation for
every candidate design, which is the only way to search a space this size but
means a shortlisted design is a hypothesis for the solver, not a result from
it. Closing that gap, by running the full simulation on the shortlist and
reporting what survives, is the work I would do next and the first thing I
would expect a reviewer to ask about.

The wall-stress magnitudes the Laplace-law estimate produces on a tetrahedral
mesh are also not physiological, for curvature reasons, so they are useful as a
relative signal for tagging and not as a quantity to report.
