"""Load saved metrics and the trained toy adder; report MSE / accuracy; plot."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import matplotlib.pyplot as plt
import torch

from dataset import P
from metrics import (
    PAPER_ACC_THRESHOLD,
    assign_phase,
    first_crossing,
    nearest_vector_accuracy,
    rounded_integer_accuracy,
)
from model import ToyAdder

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RESULTS_DIR = PROJECT_ROOT / "results"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate toy non-modular addition")
    parser.add_argument(
        "--results-dir",
        type=Path,
        default=None,
        help="Directory containing metrics.csv and checkpoint.pt.",
    )
    parser.add_argument("--experiment", type=str, default=None, help="If set with run subfolder, used to locate results.")
    parser.add_argument("--run-name", type=str, default=None, help="Subfolder under results/<experiment>/. Example: seed0_dlr0.001_dwd0")
    parser.add_argument("--acc-threshold", type=float, default=PAPER_ACC_THRESHOLD)
    return parser.parse_args()


def resolve_dir(args: argparse.Namespace) -> Path:
    if args.results_dir is not None:
        return args.results_dir
    if args.experiment is not None and args.run_name is not None:
        return RESULTS_DIR / args.experiment / args.run_name
    # Original smoke-test location, if still present and not moved.
    legacy = RESULTS_DIR / "metrics.csv"
    if legacy.exists() and (RESULTS_DIR / "checkpoint.pt").exists():
        return RESULTS_DIR
    raise FileNotFoundError(
        "Pass --results-dir PATH, or --experiment NAME --run-name RUN."
    )


def load_metrics(path: Path) -> dict[str, list]:
    columns = {"step": [], "train_loss": [], "val_loss": [], "train_acc": [], "val_acc": []}
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            columns["step"].append(int(row["step"]))
            columns["train_loss"].append(float(row["train_loss"]))
            columns["val_loss"].append(float(row["val_loss"]))
            if "train_acc" in row and row["train_acc"] != "":
                columns["train_acc"].append(float(row["train_acc"]))
            if "val_acc" in row and row["val_acc"] != "":
                columns["val_acc"].append(float(row["val_acc"]))
    return columns


def load_checkpoint(path: Path) -> dict:
    try:
        return torch.load(path, map_location="cpu", weights_only=False)
    except TypeError:
        return torch.load(path, map_location="cpu")


def plot_series(steps: list[int], values: list[float], title: str, ylabel: str, path: Path, logy: bool) -> None:
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.plot(steps, values, color="C0", linewidth=1.5)
    ax.set_xlabel("iteration")
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    if logy:
        ax.set_yscale("log")
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def scatter_pred_vs_true(y, pred, title: str, path: Path, xlabel: str, ylabel: str) -> None:
    y_np = y.detach().cpu().numpy()
    p_np = pred.detach().cpu().numpy()
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.scatter(y_np, p_np, c="C0", s=28, alpha=0.85, edgecolors="none")
    lo = float(min(y_np.min(), p_np.min()) - 0.5)
    hi = float(max(y_np.max(), p_np.max()) + 0.5)
    ax.plot([lo, hi], [lo, hi], color="gray", linestyle="--", linewidth=1)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    ax.set_aspect("equal", adjustable="box")
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def main() -> None:
    args = parse_args()
    results_dir = resolve_dir(args)
    metrics_path = results_dir / "metrics.csv"
    ckpt_path = results_dir / "checkpoint.pt"
    if not metrics_path.exists() or not ckpt_path.exists():
        raise FileNotFoundError(
            f"Expected {metrics_path} and {ckpt_path}."
        )

    columns = load_metrics(metrics_path)
    ckpt = load_checkpoint(ckpt_path)
    task = ckpt.get("task", "scalar")
    output_dim = int(ckpt.get("output_dim", 1))
    threshold = args.acc_threshold
    cfg = ckpt.get("config", {})
    init_scale = cfg.get("init_scale", 1.0)

    model = ToyAdder(n_tokens=P, embed_dim=1, init_scale=init_scale, output_dim=output_dim)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    train_i = ckpt["train_i"]
    train_j = ckpt["train_j"]
    train_y = ckpt["train_y"]
    val_i = ckpt["val_i"]
    val_j = ckpt["val_j"]
    val_y = ckpt["val_y"]
    train_c = ckpt.get("train_c")
    val_c = ckpt.get("val_c")
    target_bank = ckpt.get("target_bank")

    with torch.no_grad():
        train_pred = model(train_i, train_j)
        val_pred = model(val_i, val_j)

    if task == "scalar":
        train_mse = float(torch.mean((train_pred - train_y) ** 2).item())
        val_mse = float(torch.mean((val_pred - val_y) ** 2).item())
        train_acc = float(rounded_integer_accuracy(train_pred, train_y).item())
        val_acc = float(rounded_integer_accuracy(val_pred, val_y).item())
        train_plot_true, train_plot_pred = train_y, train_pred
        val_plot_true, val_plot_pred = val_y, val_pred
        xlabel, ylabel = "true sum i + j", "predicted sum"
    else:
        train_mse = float(torch.mean((train_pred - train_y) ** 2).item())
        val_mse = float(torch.mean((val_pred - val_y) ** 2).item())
        train_acc = float(nearest_vector_accuracy(train_pred, train_c, target_bank).item())
        val_acc = float(nearest_vector_accuracy(val_pred, val_c, target_bank).item())
        distances_tr = torch.cdist(train_pred, target_bank)
        distances_va = torch.cdist(val_pred, target_bank)
        train_plot_true, train_plot_pred = train_c.float(), distances_tr.argmin(dim=-1).float()
        val_plot_true, val_plot_pred = val_c.float(), distances_va.argmin(dim=-1).float()
        xlabel, ylabel = "true sum class c = i + j", "nearest-Y_c class"

    step_train = first_crossing(columns["step"], columns["train_acc"], threshold) if columns["train_acc"] else None
    step_val = first_crossing(columns["step"], columns["val_acc"], threshold) if columns["val_acc"] else None
    n_steps = int(cfg.get("steps", columns["step"][-1] if columns["step"] else 0))
    phase = assign_phase(step_train, step_val, n_steps)

    print("=== Evaluation (toy non-modular addition) ===")
    print(f"results_dir: {results_dir}")
    print(f"task: {task}")
    print(f"seed: {cfg.get('seed', ckpt.get('summary', {}).get('seed'))}")
    print(f"trained steps: {n_steps}")
    print(f"train pairs: {len(ckpt['train_pairs'])}  val pairs: {len(ckpt['val_pairs'])}")
    print()
    print(f"train MSE: {train_mse:.6f}   train accuracy: {train_acc:.4f}")
    print(f"val   MSE: {val_mse:.6f}   val accuracy:   {val_acc:.4f}")
    print()
    print(f"first step train acc >= {threshold}: {step_train}")
    print(f"first step val   acc >= {threshold}: {step_val}")
    print(f"phase: {phase['paper_phase']}  identifiable_under_table1={phase['identifiable_under_table1']}")
    print(phase["note"])
    if task == "scalar":
        print()
        print("Accuracy for the scalar task is rounded-integer match (reproduction assumption).")
    else:
        print()
        print("Accuracy for regression is nearest fixed vector Y_c (reproduction assumption; paper unspecified).")

    plot_series(columns["step"], columns["train_loss"], "Training loss vs iterations", "train MSE", results_dir / "train_loss.png", True)
    plot_series(columns["step"], columns["val_loss"], "Validation loss vs iterations", "val MSE", results_dir / "val_loss.png", True)
    if columns["train_acc"]:
        plot_series(columns["step"], columns["train_acc"], "Training accuracy vs iterations", "train accuracy", results_dir / "train_acc.png", False)
    if columns["val_acc"]:
        plot_series(columns["step"], columns["val_acc"], "Validation accuracy vs iterations", "val accuracy", results_dir / "val_acc.png", False)
    scatter_pred_vs_true(
        train_plot_true,
        train_plot_pred,
        "Training predictions vs true values",
        results_dir / "train_pred_vs_true.png",
        xlabel,
        ylabel,
    )
    scatter_pred_vs_true(
        val_plot_true,
        val_plot_pred,
        "Validation predictions vs true values",
        results_dir / "val_pred_vs_true.png",
        xlabel,
        ylabel,
    )

    eval_summary = {
        "task": task,
        "train_mse": train_mse,
        "val_mse": val_mse,
        "train_acc": train_acc,
        "val_acc": val_acc,
        "acc_threshold": threshold,
        "step_train_acc_threshold": step_train,
        "step_val_acc_threshold": step_val,
        **phase,
    }
    with (results_dir / "eval_summary.json").open("w", encoding="utf-8") as f:
        json.dump(eval_summary, f, indent=2)

    print()
    print(f"Saved plots in {results_dir}")


if __name__ == "__main__":
    main()
