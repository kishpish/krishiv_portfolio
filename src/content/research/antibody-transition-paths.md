---
title: "Port-Hamiltonian Reinforcement Learning for De Novo Antibody Design: Generation as Transition-Path Control Across an Energy Surface"
short: "Antibody design"
order: 1
period: "Mar 2025 to present"
role: "Student researcher, Computational Visualization Center"
kind: lab
status: "in progress"
summary: >-
  Antibody discovery is almost entirely search: build or borrow a large
  library, screen it, keep what binds, and never reach the regions of design
  space the library did not contain, however much compute is spent on it.
  This project reformulates de novo antibody design as control rather than
  classification, using a port-Hamiltonian model that carries an explicit
  energy and an explicit dissipation term, so a reinforcement learning policy
  moving a structure through design space is choosing a path across an energy
  surface and paying for it, and the agent is rewarded for reaching a binding
  configuration cheaply, which is a transition-path objective. The work is in
  progress with no results to report yet, and the claim being tested is that
  this formulation makes the cost of a design legible, since a path has a
  length and a barrier and two candidates can be compared by what it took to
  reach them rather than only by a terminal score.
problem: >-
  Antibody discovery is mostly search. You build or borrow a large library, you
  screen it, and you keep what binds. The method is bounded by what happens to
  be in the library, and the parts of design space nobody has sampled stay
  unsampled no matter how much compute you spend.
approach: >-
  Treat generation as control rather than search. A port-Hamiltonian model
  carries an explicit energy and an explicit dissipation term, so a policy that
  moves a structure through design space is choosing a path across an energy
  surface and paying for it. The agent is rewarded for reaching a binding
  configuration cheaply, which is a transition-path objective, not a
  classification objective.
result: >-
  In progress. The point of the framing is that it makes the cost of a design
  legible: a path has a length and a barrier, and two candidate designs can be
  compared by what it took to reach them rather than only by a score at the end.
landscape: >-
  This is the landscape stated outright: the model's job is the path, and the
  energy is in the architecture rather than bolted on afterwards.
evidence: []
links: []
related:
  - reward-is-a-bad-interface-for-design
  - inductive-bias-is-a-budget
---

I work on this in Prof. Chandrajit Bajaj's Computational Visualization Center at
the Oden Institute, alongside graduate students and postdocs in
physics-informed machine learning, optimal control, and reinforcement learning
for structure generation.

## Why the framing is the contribution

A generative model for protein design is usually asked a question with a
one-word answer: is this sequence good. The model learns a scalar, the sampler
chases it, and the optimizer finds whatever corner of the space makes the
scalar large. That failure is familiar enough that I wrote a whole note about
it, and the short version is that a reward is a bad interface for a design
problem because it throws away everything except the ranking.

A port-Hamiltonian formulation keeps more. The state carries an energy. Moves
dissipate. The model is not asked to score a design, it is asked to get there,
and getting there has a measurable cost. Two designs that score identically can
differ by a factor in the barrier you had to cross to produce them, and that
difference is exactly the thing a wet-lab campaign feels and a score function
hides.

## The second project

The lab also works on Parkinson's disease, and I have a second line of work
there: recoding circular RNA so that it translates reliably enough to act as a
durable therapy. I presented it as a poster and demo at the 2026 Summer
Research Demo Day, shown in the TACC Visualization Lab.

It looks like a different problem and it is not entirely. A circular construct
that translates reliably is a sequence that sits in a stable configuration
rather than one that happens to work once, which is the same question about
basins in different clothes.

## Status

This is live work with no results to report yet. What is on this page is the
problem statement and the reason I think it is the right one. When there is
something to show, it will be here with the numbers attached.
