---
title: "Reward is a bad interface for design"
description: "Scalarizing an oracle into a reward throws away the path, and in design problems the path is most of the problem."
tags: ["reinforcement-learning", "molecular-design", "control"]
section: "Models & objectives"
status: "note"
---

RL for molecular and protein design keeps producing the same paper. Take a generator, take a scoring function, treat the score as reward, run policy gradient, report that the generated molecules score better than the training set. Then nothing happens, because the molecules are unsynthesizable, or the oracle was wrong, or both.

The diagnosis usually offered is reward hacking, which is true but unhelpfully general. I think there are two specific things wrong and only one of them is about hacking.

## Your gradient inherits your oracle's noise

The policy gradient is indifferent to where the advantage comes from:

$$\nabla_\theta J(\theta) = \mathbb{E}_{\pi_\theta}\big[\nabla_\theta \log \pi_\theta(a \mid s)\, A(s,a)\big]$$

If $A$ is computed from a noisy oracle, that noise passes straight into the gradient estimate. The variance of your update is set by the variance of your scoring function, and no amount of algorithmic cleverness in the estimator fixes a scorer that is wrong in a structured way.

This matters more than it sounds because oracle noise in design is not zero-mean. It is systematic: docking scores favor certain chemotypes, learned affinity predictors favor whatever was in their training set, structure predictors favor idealized folds. A policy optimizing against systematic oracle error converges confidently to the oracle's blind spots. It is not failing to optimize. It is optimizing exactly what you gave it.

The practical ordering follows: a better oracle beats a better algorithm, nearly always, and by a wide margin. Teams routinely spend months on the RL half of this problem while the scoring function stays whatever was easiest to call in a loop. That allocation is backwards and I have not seen a convincing defense of it.

## Endpoint reward discards the path

This is the deeper one. Standard RL maximizes return over trajectories, but in most design formulations the reward is given at the end: generate a candidate, score it, done. The trajectory is a means of producing a sample and nothing about it is evaluated.

For design, the trajectory is the problem. Can the molecule be made. Are the intermediates stable. Is the conformational change physically reachable, or does it require passing through a state the system would never occupy. A formulation that scores only endpoints cannot express any of that, and the resulting candidates are often fine at the endpoint and nonsense on the way there.

The alternative is to make the path the object. Minimum energy path formulations do this directly:

$$\min_{\gamma}\ \max_{t \in [0,1]} E(\gamma(t)) \quad \text{subject to}\quad \gamma(0) = a,\ \gamma(1) = b$$

Minimize the highest barrier along the way, not the depth of the destination. A deep basin behind a wall you cannot climb is not a design. It is a fact about the landscape that happens to be inaccessible.

This reframing changes what the policy is for. It is no longer sampling candidates and hoping. It is finding a traversal, and the quantity it optimizes is a property of the whole route.

## Put the physics in the dynamics

The reflex when a policy does something impossible is to add a reward term penalizing it. Energy conservation violated, add a penalty. Bond geometry wrong, add a penalty. Each one works a little, each one needs a weight, and the weights interact.

A better option when the structure is known is to build it into the dynamics so the violation cannot be represented. Port-Hamiltonian systems are the clean version of this:

$$\dot{x} = \big(J(x) - R(x)\big)\nabla H(x) + G(x)\,u, \qquad J = -J^\top,\quad R \succeq 0$$

$J$ skew-symmetric is the conservative part, $R$ positive semidefinite is dissipation, $G$ is where control enters. Differentiate the Hamiltonian along a trajectory:

$$\dot{H} = \nabla H^\top \dot{x} = \underbrace{\nabla H^\top J \nabla H}_{= 0} - \nabla H^\top R \nabla H + \nabla H^\top G u \ \le\ \nabla H^\top G u$$

The skew term vanishes identically, because $v^\top J v = 0$ for skew $J$. The dissipation term is always a loss. So energy cannot increase except through the control channel, and the cost of any climb is exactly accounted for in a term you can read off.

The difference between this and a reward penalty is categorical. A penalty says violations are expensive and lets the optimizer trade them against return. The structure says violations are not in the hypothesis class. Nothing to tune, nothing to trade, no weight to anneal.

My rule, stated as a heuristic rather than a theorem: if you are adding reward terms to stop a policy from doing something physically impossible, the physics belongs in the dynamics. Reward should express what you want, not restate what the universe already enforces.

The cost is real. Structured dynamics constrain expressiveness, the parameterizations are fiddly, and if your assumed structure is wrong you have built a model that confidently cannot represent the truth. Worth it when the physics is actually known. Not worth it when you are guessing, and guessing happens more often than papers admit.
