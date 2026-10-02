---
title: "The bottleneck was never the GPUs"
description: "Compute is the most legible part of a computational project and almost never the expensive one. Reproducibility is not hygiene, it is the difference between a result and an anecdote."
tags: ["systems", "reproducibility", "infrastructure"]
section: "Systems"
status: "note"
---

Compute is easy to talk about because it has a number attached. Sixteen A100s. Nine thousand GPU hours. The number is legible, it sounds like effort, and it goes in the abstract.

It is also, in my experience, nowhere near the binding constraint. The expensive parts of a computational project are getting the data into a state where a model can see it, keeping the environment stable enough that a run means the same thing twice, and building pipelines that fail loudly instead of silently. None of those have a number that goes in an abstract.

## What the parallelism strategies actually buy

Worth being precise about, because people pick wrong and then blame the hardware.

**DDP** replicates the full model on every device and all-reduces gradients each step. It buys throughput. It does not buy memory, since every rank holds a complete copy of the parameters, gradients, and optimizer state.

**FSDP** shards parameters, gradients, and optimizer state across ranks, gathering what it needs per layer and releasing it after. It buys memory, at the cost of extra communication and synchronization.

The failure mode I see most: a model that fits comfortably in memory, trained with FSDP because it is the modern choice, running slower than DDP would and nobody knowing why. The question is only ever whether you are memory-bound or throughput-bound. If the model fits, DDP.

The communication arithmetic is worth internalizing too. Ring all-reduce moves about

$$2\,\frac{P-1}{P}\,|\theta|$$

bytes per rank per step, where $|\theta|$ is the parameter count. Note what is absent: batch size. Communication scales with parameters, computation scales with batch. So a small model at a large batch is compute-bound and scales nicely, while a large model at a small batch is communication-bound and adding GPUs makes it worse. Gradient accumulation helps the second case for exactly this reason, and knowing the formula tells you that before the experiment rather than after.

## Where the time actually goes

An honest accounting of a project that ends with a trained model: most of it is upstream. Finding the data. Discovering the metadata is inconsistent across releases. Writing the conversion. Discovering 3% of records fail the conversion. Deciding whether those 3% are a bug or real. Rewriting the conversion. Running it on the full set and finding the memory profile is wrong because one field is unbounded.

Then the environment. A dependency bumps a minor version and a numerical result shifts in the fourth decimal, which you notice three weeks later when two runs disagree and you cannot tell whether it was the change you made or the one pip made.

Training is the part that works. It is also the part that gets the sentence in the methods section.

## The practices that pay

Short list, all boring, all load-bearing.

**Pin everything.** Exact versions, locked, including transitive dependencies. Containerize so the pin includes the system libraries. An environment you cannot recreate is a result you cannot defend, and in genomics the tool versions matter as much as the Python ones because aligners and variant callers change behavior between releases.

**Make every step idempotent and checkpointed.** A twelve-hour pipeline that cannot resume is a twelve-hour pipeline you will run many more times than twelve hours' worth.

**Use binary columnar formats.** Parquet and HDF5 rather than CSV. Typed, compressed, seekable, and they will not silently reinterpret a gene name as a date, which is a real failure that has corrupted published supplementary tables.

**Separate configuration from code.** Every run should be a config you can diff against another config. "Which flags did that run have" should never require reading a shell history.

**Log the environment with the result.** Git SHA, container digest, config hash, random seeds, hardware. Attached to the output, not in a lab notebook.

## Why this is the actual argument

The usual pitch for reproducibility is ethical: science should be reproducible, so do your part. True, and it does not move anyone at 2am.

The argument that moves me is selfish. In six months you will need to rerun something, and the person who needs to reproduce your work first is you, with no memory of what you did and a reviewer asking a question. Reproducibility is not a tax on getting the result. It is the mechanism by which the result stays a result instead of decaying into a claim about a number you once saw.

There is a stronger version. When a single training run costs real money, nobody is going to replicate it to check you. They cannot afford to. The only thing standing between your number and an anecdote is whether the artifact lets somebody reproduce it in principle. In a compute-expensive field the pinned environment is not supporting material. It is the evidence.

The discipline is not about the hardware. The hardware is the easy part, available to anyone with a credit card, and it is not where any project I have worked on actually got stuck.
