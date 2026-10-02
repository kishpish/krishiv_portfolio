---
title: "What the score function actually buys you"
description: "Score matching is popular for one reason: the partition function vanishes. Everything else people credit it with is downstream of that, including what it costs."
tags: ["diffusion", "generative-models", "math"]
section: "Models & objectives"
status: "note"
---

Score-based models get described as a new way of learning distributions. They are better understood as one algebraic observation that happened to be enormously useful, plus a long tail of consequences people tend to attribute to the wrong cause.

Start with an energy-based model:

$$p_\theta(x) = \frac{e^{-E_\theta(x)}}{Z_\theta}, \qquad Z_\theta = \int e^{-E_\theta(x)}\,dx$$

$Z_\theta$ is the problem. It is a high-dimensional integral that depends on every parameter, it has no closed form for anything expressive, and maximum likelihood needs its gradient. Decades of work on contrastive divergence and MCMC-in-the-loop exist because of this one term.

Now take the gradient with respect to $x$ instead of $\theta$:

$$\nabla_x \log p_\theta(x) = -\nabla_x E_\theta(x) - \nabla_x \log Z_\theta = -\nabla_x E_\theta(x)$$

$Z_\theta$ does not depend on $x$, so it differentiates away. That is the trick. The entire score-based program follows from a term being constant in the variable you chose to differentiate.

## Getting to something trainable

Having the identity does not give you a loss. The natural objective compares your score network to the true one:

$$J(\theta) = \tfrac{1}{2}\,\mathbb{E}_{p(x)}\big[\lVert s_\theta(x) - \nabla_x \log p(x)\rVert^2\big]$$

which requires $\nabla_x \log p(x)$, which is the thing you do not have. Hyvärinen's integration by parts removes it:

$$J(\theta) = \mathbb{E}_{p(x)}\Big[\tfrac{1}{2}\lVert s_\theta(x)\rVert^2 + \operatorname{tr}\big(\nabla_x s_\theta(x)\big)\Big] + \text{const}$$

Elegant, and nearly useless at scale. That trace is the Jacobian diagonal, costing $O(d)$ backward passes per sample. At $d$ in the thousands it is dead on arrival.

Vincent's denoising formulation is what made the whole thing practical. Perturb the data with a Gaussian, $q_\sigma(\tilde{x} \mid x) = \mathcal{N}(\tilde{x}; x, \sigma^2 I)$, and match the score of the *conditional*, which is available in closed form:

$$\nabla_{\tilde{x}} \log q_\sigma(\tilde{x} \mid x) = -\frac{\tilde{x} - x}{\sigma^2}$$

so the objective becomes

$$\mathbb{E}_{x,\tilde{x}}\Big[\big\lVert s_\theta(\tilde{x}) + \tfrac{\tilde{x} - x}{\sigma^2} \big\rVert^2\Big]$$

Add noise, predict the noise, scale by $\sigma^2$. That is a denoiser. Every diffusion model you have ever trained is this objective with a schedule over $\sigma$ wrapped around it, and the reason the loss is "predict $\epsilon$" rather than anything more exotic is that the conditional score of a Gaussian is a straight line.

## What you gave up

Two things, and they get glossed over constantly.

**You no longer have likelihoods.** You have $\nabla_x \log p$, not $\log p$. To compare two points you integrate the score along a path between them, which means a solver, which means error. Model selection by held-out likelihood, the standard tool for deciding whether model A beats model B, is off the table. People substitute FID and sample quality, which measure something else and are gameable in ways likelihood is not.

**You learned the score of a smoothed density.** Denoising score matching recovers $\nabla \log (p * \mathcal{N}(0, \sigma^2 I))$, not $\nabla \log p$. As $\sigma \to 0$ the bias vanishes and the variance of the estimator blows up, which is precisely why the multi-scale noise schedule exists: it is a bias-variance dial, not an architectural flourish. The model never sees the sharp distribution. It sees a family of blurred ones and interpolates down.

So when a paper says a diffusion model "learns the data distribution," what it has is a family of smoothed scores plus a sampler. Those are different objects. If all you want is samples the distinction is academic. If you want to ask a question of the model, it is the whole game.

## Why this inverts in physical modeling

Here is the part I did not expect. In generative modeling the score is a means to an end and the lost likelihood is a cost. In physical modeling the ordering flips.

Write the Boltzmann relation for an observed density over cell states:

$$p(x) \propto e^{-E(x)/T} \quad \Longrightarrow \quad \nabla_x E(x) = -T\,\nabla_x \log p(x)$$

The score *is* the force, up to temperature. And almost every quantity worth having is a difference or a derivative of energy, never an absolute value. Barrier height between two basins. Mean first passage time, which through Kramers goes as $\tau \sim \tau_0 e^{\Delta E / T}$ and depends only on the difference. The committor, which solves a boundary value problem in $\nabla E$. The response to a perturbation, which is a change in the gradient field.

The unknowable constant is the thing you never needed. A score network trained with the same denoising objective used for image generation gives you basin depths and passage times for cell states directly, and the fact that it cannot tell you $p(x)$ in absolute terms costs you nothing, because nobody was going to ask.

The limitation that makes score-based models awkward as density estimators is the same property that makes them the natural tool for landscapes. Worth knowing which of the two you are doing before you pick your loss.
