"""Small controlled experiment runner (not a phase-diagram sweep).

Varies only:
* decoder learning rate
* decoder weight decay
* random seed
* number of training steps

Dataset (p=10, 45/10 split), embedding dimension, decoder widths, embedding
optimizer/LR/WD, init scale, and batch size stay fixed unless you change the
flags explicitly.

Default for --name first_controlled is a *single* run: one seed, one decoder
LR, one decoder WD, 5000 steps. That is longer than the smoke test but far
short of the paper's 10^5-step Table 1 horizon.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from train import TrainConfig, train_one

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RESULTS_DIR = PROJECT_ROOT / "results"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Controlled grokking toy-addition runs")
    parser.add_argument("--name", type=str, default="first_controlled")
    parser.add_argument("--task", choices=["scalar", "regression"], default="regression")
    parser.add_argument("--decoder-lrs", type=float, nargs="+", default=[1e-3])
    parser.add_argument("--decoder-wds", type=float, nargs="+", default=[0.0])
    parser.add_argument("--seeds", type=int, nargs="+", default=[0])
    parser.add_argument("--steps", type=int, default=5000)
    parser.add_argument("--embed-lr", type=float, default=1e-3, help="Fixed unless you override. Fig 6 uses 1e-3.")
    parser.add_argument("--embed-wd", type=float, default=0.0)
    parser.add_argument("--init-scale", type=float, default=1.0)
    parser.add_argument("--batch-size", type=int, default=45)
    parser.add_argument("--acc-threshold", type=float, default=0.9)
    parser.add_argument("--log-every", type=int, default=1)
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--results-root", type=Path, default=RESULTS_DIR)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    summaries = []
    n_runs = len(args.seeds) * len(args.decoder_lrs) * len(args.decoder_wds)
    print(f"=== Controlled experiment {args.name!r}: {n_runs} run(s) ===")
    print(f"task={args.task}  steps={args.steps}")
    print(f"decoder_lrs={args.decoder_lrs}")
    print(f"decoder_wds={args.decoder_wds}")
    print(f"seeds={args.seeds}")
    print()

    for seed in args.seeds:
        for decoder_lr in args.decoder_lrs:
            for decoder_wd in args.decoder_wds:
                cfg = TrainConfig(
                    seed=seed,
                    steps=args.steps,
                    task=args.task,
                    embed_lr=args.embed_lr,
                    decoder_lr=decoder_lr,
                    embed_wd=args.embed_wd,
                    decoder_wd=decoder_wd,
                    init_scale=args.init_scale,
                    batch_size=args.batch_size,
                    log_every=args.log_every,
                    acc_threshold=args.acc_threshold,
                    experiment=args.name,
                    results_root=args.results_root,
                    overwrite=args.overwrite,
                )
                summaries.append(train_one(cfg))

    out_root = args.results_root / args.name
    out_root.mkdir(parents=True, exist_ok=True)
    index_path = out_root / "index.csv"
    fieldnames = [
        "experiment",
        "task",
        "seed",
        "steps",
        "decoder_lr",
        "decoder_wd",
        "embed_lr",
        "step_train_acc_threshold",
        "step_val_acc_threshold",
        "delay_steps",
        "paper_phase",
        "identifiable_under_table1",
        "output_dir",
    ]
    with index_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(summaries)
    with (out_root / "index.json").open("w", encoding="utf-8") as f:
        json.dump(summaries, f, indent=2)
    print()
    print(f"Wrote experiment index to {index_path}")


if __name__ == "__main__":
    main()
