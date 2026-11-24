---
title: "Patient-specific hydrogels for post-infarction cardiac repair"
short: "Cardiac biomaterials"
order: 2
period: "May 2025 to Feb 2026"
role: "First author"
kind: independent
paper: hydrogel-bibm-2026
honor: "1st Place, Texas Science and Engineering Fair 2026"
summary: >-
  Scar replaces muscle permanently after a heart attack, and the gel you would inject interacts
  with the geometry of one patient's damage, so the experiment you actually want is the one you
  cannot run. This is the first pipeline that runs from a patient's cardiac MRI to a hydrogel
  prescription for that particular heart, with the ranking it produces checked against full
  finite-element simulation rather than asserted. HYDRA-BERT, a chemical language model adapted
  from a frozen polyBERT trunk and refined with reinforcement learning, screens ten million
  formulations per patient at 19,608 designs a second and predicts the gain on patients it has
  never seen at R² 0.89, which is one new MRI to one deliverable design in about 37 minutes.
  Across 60 heart models the selected gels raised ejection fraction by 9.1 points and cut
  border-zone wall stress by 30.1%, and in 210 sealed simulations the recorded ranking held
  inside every patient at ρ = 0.93 to 0.98, including two hearts the model was never trained on.
problem: >-
  Scar replaces muscle permanently after a myocardial infarction. An injectable
  hydrogel could support the wall while the tissue remodels, but a gel is not
  one thing: stiffness, degradation rate, conductivity, thickness, and where you
  put it all interact with the geometry of one patient's damage. Matching a
  material to a heart is years of trial and error, and the one test you want,
  trying it on that patient, is the one you cannot run.
approach: >-
  Close the loop in silico. On one side, a chemical language model proposes and scores
  formulations across the design space. That model is HYDRA-BERT, built on a frozen
  86.1M-parameter polyBERT trunk with 1.18M trainable low-rank adapters over it, then refined
  with proximal policy optimization and run down a six-stage cascade that takes ten million
  candidates to one. On the other, a geometry pipeline turns each patient's surface meshes into
  a tetrahedral heart with inferred scar, border zone, transmural coordinates, and helical fibre
  architecture, ready for mechanical and electrophysiology solvers. A design is only a candidate
  if it clears thresholds on both sides, and infeasible layouts are rejected rather than
  clipped.
result: >-
  Ten patient-specific hearts built end to end, 3.66 million tetrahedral elements across them
  with none inverted, eight personalized to their imaged volumes and six carried through design
  and verification. Injection sites are placed from curvature-corrected wall stress and
  heat-method geodesics: 17 sites, 82.4% in the border zone and none in scar, with 99.5% of
  1,927 simulated depots landing in the border zone. The ranking was sealed with a SHA-256 hash
  before the first solve, and all 210 finite-element simulations converged. The optimized design
  beat a clinical-style 4 kPa alginate in all six patients.
landscape: >-
  This one is a search rather than a trajectory: a design space with a scoring
  surface over it, and the question is which point moves a patient from one
  state to a better one.
headline: "+9.1 points"
evidence:
  - value: "+9.1 pts"
    label: "ejection fraction across 60 heart models, p < 0.0001"
  - value: "10 million"
    label: "formulations screened per patient, narrowed to one prescription"
  - value: "0.93 to 0.98"
    label: "rank correlation of the sealed prediction, inside every patient"
  - value: "210"
    label: "finite-element verification solves, all converged"
abstract_kind: paper
abstract: >-
    Injectable hydrogels can thicken the infarcted left-ventricular (LV) wall and reduce the
    stress that drives heart failure, but injection sites are selected visually and formulations
    empirically. We present, to our knowledge, the first pipeline from cardiac magnetic
    resonance imaging (MRI) to a patient-specific hydrogel prescription with a design ranking
    verified by finite-element (FE) simulation. It (i) converts sparse atlas data into LV models
    personalized to imaged volumes, (ii) selects injection sites from curvature-corrected wall
    stress and heat-method geodesics, (iii) searches 10⁷ formulations per patient with
    HYDRA-BERT (HYdrogel Domain Refined Adaptation of BERT), a low-rank-adapted chemical
    language model coupled to reinforcement learning (hold-out R² = 0.89), and (iv) verifies a
    design ranking with 210 FE simulations whose predictions were recorded in advance. In the
    surrogate-based HYDRA-BERT evaluation over 60 models (50 synthetic), selected designs
    increased ejection fraction by 9.1 ± 0.4 percentage points and reduced border-zone stress by
    30.1%. In the FE program, recorded predictions ranked designs within each patient with ρ =
    0.93–0.98, including two patients excluded from training, and the effect at the catheter
    dose was small and largely unfavorable, governed by gel volume offset by stiffness and
    limited by border-zone thickness.
poster:
  src: "/media/fig-cardiac-poster"
  width: 1100
  height: 1555
  fallback: jpg
  href: "https://kishpish.github.io/ai-heart-repair/assets/docs/potluri-2026-ieee-bibm-poster.pdf"
  label: "IEEE BIBM 2026, poster P229"
  caption: >-
    The conference poster, in full. Introduction and pipeline across the top, the two frameworks
    through the middle, and the results and sealed verification along the bottom. Open it for the
    readable A0 sheet.
  alt: >-
    An A0 conference poster titled AI-Driven Inverse Design of Patient-Specific Hydrogels for
    Post-Infarction Cardiac Repair, laid out in three bands. The top band covers myocardial
    infarction and the Law of Laplace beside the four pipeline contributions. The middle band
    shows the automated cardiac physics framework, with MRI contours, a scar and border-zone
    map, gel depots and an infarct cut-away, next to the HYDRA-BERT architecture. The bottom
    band holds the outcome table, a chart of per-patient rank correlations from 0.929 to 0.983,
    and the mechanistic insights.
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
