"""Accuracy, threshold crossings, and learning-phase labels.

Paper (Section 4.1 and Appendix A, Table 1):
    Phases are defined from whether training / validation accuracy exceed 90%
    within 10^5 steps, and whether
        step(val acc > 90%) - step(train acc > 90%) < 10^3.

The paper does not define how "accuracy" is computed for vector-valued
regression. Functions below document the reproduction rule used for each task.
"""

from __future__ import annotations

from typing import Optional

import torch


# Appendix A, Table 1.
PAPER_ACC_THRESHOLD = 0.9
PAPER_PHASE_HORIZON = 100_000
PAPER_GROKKING_DELAY = 1_000


def rounded_integer_accuracy(pred: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
    """Scalar-sum accuracy (reproduction assumption, not in the paper).

    Counts a pair as correct if round(prediction) equals the integer sum.
    """
    return (torch.round(pred) == torch.round(y)).float().mean()


def nearest_vector_accuracy(
    pred: torch.Tensor,
    true_class: torch.Tensor,
    target_bank: torch.Tensor,
) -> torch.Tensor:
    """Regression accuracy (reproduction assumption).

    Paper regression targets are fixed random vectors Y_c. The paper reports
    training/validation accuracy but does not say how a vector prediction is
    turned into a class. We assign the class whose Y_c is nearest in Euclidean
    distance, then compare to the true sum c = i + j.
    """
    distances = torch.cdist(pred, target_bank)
    pred_class = distances.argmin(dim=-1)
    return (pred_class == true_class).float().mean()


def first_crossing(steps: list[int], values: list[float], threshold: float) -> Optional[int]:
    for step, value in zip(steps, values):
        if value >= threshold:
            return int(step)
    return None


def assign_phase(
    step_train: Optional[int],
    step_val: Optional[int],
    n_steps_trained: int,
    *,
    horizon: int = PAPER_PHASE_HORIZON,
    delay_threshold: int = PAPER_GROKKING_DELAY,
) -> dict:
    """Map threshold-crossing times to Table 1, without over-claiming.

    Table 1 asks whether 90% accuracy is reached *within 10^5 steps*. If this
    run is shorter than that horizon and a criterion has not been met, the
    paper label is not identifiable yet.
    """
    truncated = n_steps_trained < horizon
    train_yes = step_train is not None and step_train <= min(n_steps_trained, horizon)
    val_yes = step_val is not None and step_val <= min(n_steps_trained, horizon)

    delay = None
    if train_yes and val_yes:
        delay = int(step_val) - int(step_train)

    if not train_yes and not val_yes:
        paper_phase = "confusion"
        if truncated:
            identifiable = False
            note = (
                "Neither train nor val reached the threshold. Table 1 would call "
                "this confusion only after a 10^5-step horizon; this run is shorter."
            )
        else:
            identifiable = True
            note = "Neither train nor val reached 90% within 10^5 steps (Table 1 confusion)."
    elif train_yes and not val_yes:
        paper_phase = "memorization"
        if truncated:
            identifiable = False
            note = (
                "Train reached 90% but val did not. Table 1 memorization requires "
                "that val still fail within 10^5 steps; this run is shorter."
            )
        else:
            identifiable = True
            note = "Train reached 90% within 10^5 steps; val did not (Table 1 memorization)."
    elif train_yes and val_yes:
        identifiable = True
        if delay is not None and delay < delay_threshold:
            paper_phase = "comprehension"
            note = (
                f"Both reached 90%; delay={delay} < {delay_threshold} "
                "(Table 1 comprehension)."
            )
        else:
            paper_phase = "grokking"
            note = (
                f"Both reached 90%; delay={delay} >= {delay_threshold} "
                "(Table 1 grokking)."
            )
    else:
        # Val without train should be rare; do not force a Table 1 name.
        paper_phase = "unclassified"
        identifiable = False
        note = "Validation crossed 90% before training; Table 1 does not define this case."

    return {
        "paper_phase": paper_phase,
        "identifiable_under_table1": identifiable,
        "truncated_vs_paper_horizon": truncated,
        "delay_steps": delay,
        "note": note,
    }
