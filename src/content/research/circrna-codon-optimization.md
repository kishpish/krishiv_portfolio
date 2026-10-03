---
title: "Port-Hamiltonian driven Structurally-Constrained Codon Optimization of circRNA IRES-CDS Junctions"
short: "circRNA junctions"
order: 6
period: "2026 to present"
role: "Student researcher, Computational Visualization Center"
kind: lab
status: "in progress"
summary: >-
  A circular RNA only translates if the junction between its internal ribosome
  entry site and its coding sequence keeps the structure the IRES needs, and
  synonymous codon choice is the one lever that changes the fold without
  changing the protein. This searches that codon space under a port-Hamiltonian
  objective, so a recoding is a path with a structural cost rather than a
  ranked list of candidates. In progress, no results yet.
problem: >-
  Codon optimizers maximise expression proxies and ignore the fold. At an
  IRES-CDS junction that is exactly backwards, because the structure is what
  recruits the ribosome in the first place.
approach: >-
  Treat synonymous recoding as movement over a structural energy surface, with
  the port-Hamiltonian framing supplying an explicit energy and dissipation term
  so the cost of a given recoding is part of the objective rather than a filter
  applied afterwards.
result: >-
  In progress. The target is a durable circular RNA therapy for the lab's
  Parkinson's disease work, which needs translation that holds rather than
  translation that peaks.
landscape: >-
  The same shape as the antibody work: the surface is structural rather than
  energetic in the binding sense, and the object being optimised is the route
  across it.
evidence: []
links: []
related:
  - inductive-bias-is-a-budget
---

## Why the junction

An internal ribosome entry site works by folding. It is a structure that
recruits a ribosome without a cap, and the part of it that matters most is
where it meets the sequence it is supposed to start translating. Join those two
pieces carelessly and the fold the IRES depends on is disturbed by the first
few codons of the coding sequence.

Synonymous codon choice is the only lever that changes that fold without
changing the protein. Most codon optimizers do not use it that way. They
maximise a proxy for expression, codon adaptation index or GC content or
something similar, and they treat structure as a constraint to check at the
end if at all.

## What is different here

The optimisation is over paths, not over candidates. The port-Hamiltonian
framing carries an explicit energy and an explicit dissipation term, so a
recoding has a cost that is part of the objective rather than a filter applied
afterwards. That is the same formulation as the antibody work, pointed at a
different surface.

This is early. There are no results to report, and the honest statement of
where it stands is that the formulation is built and the evaluation is not.
