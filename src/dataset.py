"""Non-modular addition dataset for the toy grokking experiment.

Paper (Liu et al., NeurIPS 2022, Section 2 and Appendix G):

* Integers i, j in {0, ..., p-1} with p = 10.
* i+j and j+i are the same sample, so there are p(p+1)/2 = 55 unique pairs.
* Train / validation split is 45 / 10. The paper does not list which 10 pairs
  are held out; we shuffle with an isolated RNG seeded by the experiment seed.

Targets:

* Paper regression: a *fixed random vector* Y_c in R^{d_out} for the sum
  c = i + j (Section 2). d_out = 30 matches the last decoder width in Appendix G.
  The sampling distribution of Y_c is not specified; we use i.i.d. Gaussian
  entries from an isolated generator.
* Paper classification: one-hot Y_c (not implemented in this experiment).
* Smoke-test task: scalar y = i + j (reproduction choice, not the paper target).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import torch


# Section 2 / Appendix G.
P = 10
N_TRAIN = 45
N_VAL = 10
# Possible sums i+j for p=10 are 0, ..., 18.
N_SUMS = 2 * P - 1
# Appendix G decoder ends at width 30; Section 2 uses Y_c in R^{d_out}.
D_OUT = 30


def all_unique_pairs(p: int = P) -> list[tuple[int, int]]:
    """Return all unique unordered pairs (i, j) with 0 <= i <= j < p."""
    return [(i, j) for i in range(p) for j in range(i, p)]


@dataclass
class AdditionSplit:
    train_i: torch.Tensor
    train_j: torch.Tensor
    train_c: torch.Tensor  # integer sums i+j
    train_y: torch.Tensor  # task-specific regression targets
    val_i: torch.Tensor
    val_j: torch.Tensor
    val_c: torch.Tensor
    val_y: torch.Tensor
    train_pairs: list[tuple[int, int]]
    val_pairs: list[tuple[int, int]]
    target_bank: Optional[torch.Tensor]
    task: str


def _pairs_to_index_tensors(
    pairs: list[tuple[int, int]],
) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    i = torch.tensor([a for a, _ in pairs], dtype=torch.long)
    j = torch.tensor([b for _, b in pairs], dtype=torch.long)
    c = (i + j).to(dtype=torch.long)
    return i, j, c


def make_target_bank(n_classes: int, d_out: int, seed: int) -> torch.Tensor:
    """Fixed random output vectors Y_c (Section 2).

    Assumption: Y_c ~ N(0, I). The paper only says "fixed random vector".
    """
    generator = torch.Generator().manual_seed(seed)
    return torch.randn(n_classes, d_out, generator=generator)


def make_split(
    seed: int,
    p: int = P,
    n_train: int = N_TRAIN,
    n_val: int = N_VAL,
    task: str = "scalar",
    d_out: int = D_OUT,
    verbose: bool = True,
) -> AdditionSplit:
    """Generate the 55 pairs and a reproducible 45/10 split."""
    if task not in {"scalar", "regression"}:
        raise ValueError(f"Unsupported task {task!r}. Use 'scalar' or 'regression'.")

    pairs = all_unique_pairs(p)
    n_total = len(pairs)
    if n_train + n_val != n_total:
        raise ValueError(
            f"Expected n_train + n_val = {n_total} unique pairs, got {n_train} + {n_val}."
        )

    # Isolated generator: shuffling does not consume the global PyTorch RNG,
    # so model initialization stays aligned with the original smoke test.
    generator = torch.Generator().manual_seed(seed)
    perm = torch.randperm(n_total, generator=generator).tolist()
    shuffled = [pairs[k] for k in perm]
    train_pairs = shuffled[:n_train]
    val_pairs = shuffled[n_train:]

    train_i, train_j, train_c = _pairs_to_index_tensors(train_pairs)
    val_i, val_j, val_c = _pairs_to_index_tensors(val_pairs)

    target_bank: Optional[torch.Tensor]
    if task == "scalar":
        # Smoke-test target (not the paper's Y_c).
        target_bank = None
        train_y = train_c.to(dtype=torch.float32)
        val_y = val_c.to(dtype=torch.float32)
    else:
        n_sums = 2 * p - 1
        target_bank = make_target_bank(n_sums, d_out, seed=seed)
        train_y = target_bank[train_c]
        val_y = target_bank[val_c]

    if verbose:
        print(f"Unique unordered pairs: {n_total}")
        print(f"Training pairs: {len(train_pairs)}")
        print(f"Validation pairs: {len(val_pairs)}")
        print(f"Task / target: {task}")

    return AdditionSplit(
        train_i=train_i,
        train_j=train_j,
        train_c=train_c,
        train_y=train_y,
        val_i=val_i,
        val_j=val_j,
        val_c=val_c,
        val_y=val_y,
        train_pairs=train_pairs,
        val_pairs=val_pairs,
        target_bank=target_bank,
        task=task,
    )


if __name__ == "__main__":
    make_split(seed=0, task="scalar")
