"""Train the toy adder on non-modular addition.

Paper optimizers (Section 4.1):
* Adam on embedding parameters, learning rate in [1e-5, 1e-2], weight decay 0.
* AdamW on decoder parameters, learning rate in [1e-5, 1e-2], weight decay
  in [0, 10] for regression.

Appendix G defaults used when not sweeping:
* full batch size 45
* embedding init scale s = 1
* representation weight decay 0
* embedding learning rate 1e-3 in the Figure 6 sweeps

Appendix G also says both representation and decoder are optimized with AdamW;
Section 4.1 says Adam for 1D embeddings. We follow Section 4.1.

Default CLI values reproduce the original 300-step scalar smoke test. Longer
paper-style runs go through --task regression and an experiment-specific folder.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Optional

import numpy as np
import torch
from torch import nn

from dataset import D_OUT, P, make_split
from metrics import (
    PAPER_ACC_THRESHOLD,
    PAPER_GROKKING_DELAY,
    PAPER_PHASE_HORIZON,
    assign_phase,
    first_crossing,
    nearest_vector_accuracy,
    rounded_integer_accuracy,
)
from model import ToyAdder

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RESULTS_DIR = PROJECT_ROOT / "results"


@dataclass
class TrainConfig:
    seed: int = 0
    target_seed: Optional[int] = None
    steps: int = 300
    task: str = "scalar"  # "scalar" smoke test; "regression" paper Y_c
    embed_lr: float = 1e-3
    decoder_lr: float = 1e-3
    embed_wd: float = 0.0
    decoder_wd: float = 0.0
    init_scale: float = 1.0
    batch_size: int = 45  # Appendix G default: full training set
    log_every: int = 1
    acc_threshold: float = PAPER_ACC_THRESHOLD
    experiment: str = "smoke"
    results_root: Path = RESULTS_DIR
    results_dir: Optional[Path] = None
    overwrite: bool = False


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
    try:
        torch.use_deterministic_algorithms(True)
    except (RuntimeError, AttributeError):
        pass


def format_lr(value: float) -> str:
    return f"{value:.6g}"


def default_run_dir(cfg: TrainConfig) -> Path:
    run_name = (
        f"seed{cfg.seed}_dlr{format_lr(cfg.decoder_lr)}_dwd{format_lr(cfg.decoder_wd)}"
    )
    return cfg.results_root / cfg.experiment / run_name


def parse_args() -> TrainConfig:
    parser = argparse.ArgumentParser(description="Toy non-modular addition training")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument(
    "--target-seed",
    type=int,
    default=None,
    help="Seed for fixed random Y_c target vectors. Defaults to --seed.",
)
    parser.add_argument(
        "--target-seed",
        type=int,
        default=None,
        help="Seed for fixed random Y_c target vectors. Defaults to --seed.",
    )
    parser.add_argument(
        "--task",
        choices=["scalar", "regression"],
        default="scalar",
        help="scalar: y=i+j smoke test. regression: paper fixed random vectors Y_c in R^30.",
    )
    parser.add_argument("--embed-lr", type=float, default=1e-3, help="Adam LR for embeddings. Paper sweeps [1e-5, 1e-2]; Fig 6 fixes 1e-3.")
    parser.add_argument("--decoder-lr", type=float, default=1e-3, help="AdamW LR for the decoder. Paper sweeps [1e-5, 1e-2].")
    parser.add_argument("--embed-wd", type=float, default=0.0, help="Section 4.1: zero weight decay for 1D embeddings.")
    parser.add_argument("--decoder-wd", type=float, default=0.0, help="AdamW weight decay for the decoder. Paper sweeps [0, 10] for regression.")
    parser.add_argument("--init-scale", type=float, default=1.0, help="Embedding init scale s; Uniform[-s/2, s/2]. Appendix G default s=1.")
    parser.add_argument("--batch-size", type=int, default=45, help="Appendix G default: full batch 45.")
    parser.add_argument("--log-every", type=int, default=1)
    parser.add_argument("--acc-threshold", type=float, default=PAPER_ACC_THRESHOLD, help="Table 1 uses 90% accuracy.")
    parser.add_argument("--experiment", type=str, default="smoke", help="Results go to results/<experiment>/... so runs do not clobber each other.")
    parser.add_argument("--results-root", type=Path, default=RESULTS_DIR)
    parser.add_argument("--results-dir", type=Path, default=None, help="If set, write exactly here (still refuses to overwrite unless --overwrite).")
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument(
        "--preset",
        choices=["none", "smoke", "paper_regression"],
        default="none",
        help="Optional named bundle. smoke: original 300-step scalar run. paper_regression: Y_c task with Fig-6 embed LR.",
    )
    args = parser.parse_args()

    cfg = TrainConfig(
        seed=args.seed,
        target_seed=args.target_seed,
        steps=args.steps,
        task=args.task,
        embed_lr=args.embed_lr,
        decoder_lr=args.decoder_lr,
        embed_wd=args.embed_wd,
        decoder_wd=args.decoder_wd,
        init_scale=args.init_scale,
        batch_size=args.batch_size,
        log_every=args.log_every,
        acc_threshold=args.acc_threshold,
        experiment=args.experiment,
        results_root=args.results_root,
        results_dir=args.results_dir,
        overwrite=args.overwrite,
    )
    if args.preset == "smoke":
        cfg.task = "scalar"
        cfg.steps = 300
        cfg.experiment = "smoke"
        cfg.seed = args.seed
        cfg.decoder_lr = args.decoder_lr
        cfg.decoder_wd = args.decoder_wd
    elif args.preset == "paper_regression":
        cfg.task = "regression"
        cfg.embed_lr = 1e-3
        cfg.embed_wd = 0.0
        cfg.init_scale = 1.0
        cfg.batch_size = 45
        if cfg.experiment == "smoke":
            cfg.experiment = "paper_regression"
    return cfg


def _prepare_output_dir(cfg: TrainConfig) -> Path:
    out = cfg.results_dir if cfg.results_dir is not None else default_run_dir(cfg)
    if out.exists() and any(out.iterdir()) and not cfg.overwrite:
        raise FileExistsError(
            f"Refusing to overwrite non-empty directory {out}. "
            "Choose a new --experiment name or pass --overwrite."
        )
    out.mkdir(parents=True, exist_ok=True)
    return out


def _accuracy(
    task: str,
    pred: torch.Tensor,
    y: torch.Tensor,
    classes: torch.Tensor,
    target_bank: Optional[torch.Tensor],
) -> float:
    if task == "scalar":
        return float(rounded_integer_accuracy(pred, y).item())
    assert target_bank is not None
    return float(nearest_vector_accuracy(pred, classes, target_bank).item())


def train_one(cfg: TrainConfig) -> dict:
    set_seed(cfg.seed)
    device = torch.device("cpu")
    out_dir = _prepare_output_dir(cfg)
    output_dim = 1 if cfg.task == "scalar" else D_OUT

    print("=== Toy non-modular addition ===")
    print(f"experiment: {cfg.experiment}")
    print(f"output_dir: {out_dir}")
    print(f"seed: {cfg.seed}")
    print(f"p: {P}")
    print(f"task: {cfg.task}")
    print(f"steps: {cfg.steps}")
    print(f"embed_lr (Adam): {cfg.embed_lr}")
    print(f"embed_wd: {cfg.embed_wd}")
    print(f"decoder_lr (AdamW): {cfg.decoder_lr}")
    print(f"decoder_wd: {cfg.decoder_wd}")
    print(f"init_scale: {cfg.init_scale}")
    print(f"batch_size: {cfg.batch_size}")
    print(f"acc_threshold: {cfg.acc_threshold}")
    print(f"device: {device}")
    if cfg.task == "scalar":
        print("architecture: Embedding(10, 1) -> sum -> MLP 1-200-200-30-1")
        print("loss: MSE on scalar y = i + j  (smoke-test target, not paper Y_c)")
    else:
        print("architecture: Embedding(10, 1) -> sum -> MLP 1-200-200-30")
        print("loss: MSE on fixed random Y_c in R^30 (Section 2 regression)")
    print("batch: Appendix G default is full training set size 45")
    print()

    data = make_split(
        seed=cfg.seed,
        target_seed=cfg.target_seed,
        task=cfg.task,
        d_out=D_OUT,
    )
    train_i = data.train_i.to(device)
    train_j = data.train_j.to(device)
    train_c = data.train_c.to(device)
    train_y = data.train_y.to(device)
    val_i = data.val_i.to(device)
    val_j = data.val_j.to(device)
    val_c = data.val_c.to(device)
    val_y = data.val_y.to(device)
    target_bank = None if data.target_bank is None else data.target_bank.to(device)

    n_train = train_i.shape[0]
    if cfg.batch_size <= 0 or cfg.batch_size > n_train:
        raise ValueError(f"batch_size must be in 1..{n_train}, got {cfg.batch_size}.")

    model = ToyAdder(
        n_tokens=P,
        embed_dim=1,
        init_scale=cfg.init_scale,
        output_dim=output_dim,
    ).to(device)
    # Section 4.1: Adam on embeddings, AdamW on decoder.
    opt_embed = torch.optim.Adam(model.embedding.parameters(), lr=cfg.embed_lr, weight_decay=cfg.embed_wd)
    opt_decoder = torch.optim.AdamW(model.decoder.parameters(), lr=cfg.decoder_lr, weight_decay=cfg.decoder_wd)
    loss_fn = nn.MSELoss()

    rows: list[dict] = []
    for step in range(1, cfg.steps + 1):
        model.train()
        if cfg.batch_size == n_train:
            batch_i, batch_j, batch_y, batch_c = train_i, train_j, train_y, train_c
        else:
            # Mini-batching is supported because Appendix G sweeps batch size,
            # but the default remains the full 45.
            idx = torch.randint(0, n_train, (cfg.batch_size,))
            batch_i, batch_j, batch_y, batch_c = train_i[idx], train_j[idx], train_y[idx], train_c[idx]

        opt_embed.zero_grad(set_to_none=True)
        opt_decoder.zero_grad(set_to_none=True)
        pred = model(batch_i, batch_j)
        train_loss = loss_fn(pred, batch_y)
        train_loss.backward()
        opt_embed.step()
        opt_decoder.step()

        if step % cfg.log_every == 0 or step == cfg.steps:
            model.eval()
            with torch.no_grad():
                train_pred_full = model(train_i, train_j)
                val_pred = model(val_i, val_j)
                train_loss_full = loss_fn(train_pred_full, train_y)
                val_loss = loss_fn(val_pred, val_y)
                train_acc = _accuracy(cfg.task, train_pred_full, train_y, train_c, target_bank)
                val_acc = _accuracy(cfg.task, val_pred, val_y, val_c, target_bank)
            rows.append(
                {
                    "step": step,
                    "train_loss": float(train_loss_full.item()),
                    "val_loss": float(val_loss.item()),
                    "train_acc": train_acc,
                    "val_acc": val_acc,
                }
            )
            if step == 1 or step % max(cfg.log_every, 50) == 0 or step == cfg.steps:
                print(
                    f"step {step:5d}  train_mse={train_loss_full.item():.6f}  "
                    f"val_mse={val_loss.item():.6f}  "
                    f"train_acc={train_acc:.3f}  val_acc={val_acc:.3f}"
                )

    steps = [int(r["step"]) for r in rows]
    train_accs = [float(r["train_acc"]) for r in rows]
    val_accs = [float(r["val_acc"]) for r in rows]
    step_train = first_crossing(steps, train_accs, cfg.acc_threshold)
    step_val = first_crossing(steps, val_accs, cfg.acc_threshold)
    phase = assign_phase(step_train, step_val, cfg.steps)

    metrics_path = out_dir / "metrics.csv"
    with metrics_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["step", "train_loss", "val_loss", "train_acc", "val_acc"])
        writer.writeheader()
        writer.writerows(rows)

    summary = {
        "experiment": cfg.experiment,
        "task": cfg.task,
        "seed": cfg.seed,
        "steps": cfg.steps,
        "embed_lr": cfg.embed_lr,
        "decoder_lr": cfg.decoder_lr,
        "embed_wd": cfg.embed_wd,
        "decoder_wd": cfg.decoder_wd,
        "init_scale": cfg.init_scale,
        "batch_size": cfg.batch_size,
        "acc_threshold": cfg.acc_threshold,
        "paper_phase_horizon": PAPER_PHASE_HORIZON,
        "paper_grokking_delay": PAPER_GROKKING_DELAY,
        "step_train_acc_threshold": step_train,
        "step_val_acc_threshold": step_val,
        **phase,
        "n_train": n_train,
        "n_val": int(val_i.shape[0]),
        "output_dir": str(out_dir),
    }
    with (out_dir / "config.json").open("w", encoding="utf-8") as f:
        json.dump({**asdict(cfg), "results_root": str(cfg.results_root), "results_dir": str(out_dir)}, f, indent=2)
    with (out_dir / "summary.json").open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "config": {**asdict(cfg), "results_root": str(cfg.results_root), "results_dir": str(out_dir)},
            "summary": summary,
            "task": cfg.task,
            "output_dim": output_dim,
            "train_pairs": data.train_pairs,
            "val_pairs": data.val_pairs,
            "train_i": data.train_i,
            "train_j": data.train_j,
            "train_c": data.train_c,
            "train_y": data.train_y,
            "val_i": data.val_i,
            "val_j": data.val_j,
            "val_c": data.val_c,
            "val_y": data.val_y,
            "target_bank": data.target_bank,
        },
        out_dir / "checkpoint.pt",
    )

    print()
    print(f"first step train acc >= {cfg.acc_threshold}: {step_train}")
    print(f"first step val   acc >= {cfg.acc_threshold}: {step_val}")
    print(f"phase label: {phase['paper_phase']}  identifiable={phase['identifiable_under_table1']}")
    print(phase["note"])
    print(f"Wrote metrics to {metrics_path}")
    print(f"Wrote checkpoint to {out_dir / 'checkpoint.pt'}")
    return summary


def main() -> None:
    cfg = parse_args()
    train_one(cfg)


if __name__ == "__main__":
    main()
