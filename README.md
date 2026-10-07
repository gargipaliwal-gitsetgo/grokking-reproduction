# Grokking reproduction (toy non-modular addition)

This project reproduces parts of:

**Liu, Kitouni, Nolte, Michaud, Tegmark, Williams.** *Towards Understanding Grokking: An Effective Theory of Representation Learning.* NeurIPS 2022.

Scope so far: **toy non-modular addition only**. No MNIST, no transformer, no phase-diagram grid.

## What grokking is

Grokking is delayed generalization: a network first fits the training set and only later generalizes. Liu et al. tie this, on algorithmic tasks, to learning a structured embedding (for addition, roughly \(E_k \approx a + kb\)).

Appendix A, Table 1 names four regimes from **90% accuracy** and a **\(10^5\)-step** horizon:

| Phase | train acc \(> 90\%\) within \(10^5\) steps | val acc \(> 90\%\) within \(10^5\) steps | \(\mathrm{step}(\mathrm{val}>90\%) - \mathrm{step}(\mathrm{train}>90\%) < 10^3\) |
|---|---|---|---|
| Comprehension | yes | yes | yes |
| Grokking | yes | yes | no |
| Memorization | yes | no | n/a |
| Confusion | no | no | n/a |

If a run is shorter than \(10^5\) steps and a criterion has not been met, we **do not** treat the Table 1 name as identified.

## What the paper actually specifies (this toy task)

From Sections 2 and 4.1 and Appendix G:

- \(p = 10\), unordered pairs, \(p(p+1)/2 = 55\) samples, split **45 / 10**.
- Model: \((i,j) \mapsto \mathrm{Dec}(E_i + E_j)\), **1D** embeddings, addition hard-coded.
- Decoder widths **1 → 200 → 200 → 30**.
- Regression target: fixed random vector \(Y_c \in \mathbb{R}^{d_\mathrm{out}}\) for \(c = i+j\). Classification uses a one-hot \(Y_c\) (not implemented here).
- Embeddings: Adam, LR in \([10^{-5},10^{-2}]\), **weight decay 0**. Figure 6 fixes embed LR at \(10^{-3}\).
- Decoder: AdamW, LR in \([10^{-5},10^{-2}]\), WD in \([0,10]\) (regression).
- Default batch **45**, init scale \(s=1\), embedding entries \(\sim \mathrm{Uniform}[-s/2,s/2]\).
- Phase labels: 90% train/val accuracy, horizon \(10^5\), grokking delay \(\ge 10^3\).

Appendix G also says representation and decoder are both trained with AdamW. **Section 4.1 says Adam for 1D embeddings.** This code follows Section 4.1.

## What this implementation assumes (paper silent)

- Hidden activation: **ReLU**.
- Decoder Linear initialization: **PyTorch defaults**.
- Distribution of \(Y_c\): **i.i.d. Gaussian**, frozen, isolated RNG.
- Regression **accuracy**: nearest \(Y_c\) in Euclidean distance (paper never defines vector-regression accuracy).
- Scalar smoke-test accuracy: **round(pred) = i+j**.
- Which 10 pairs are validation: **seeded shuffle**, not a published list.
- Scalar head **30 → 1**: only for the smoke test, not a paper layer.
- Exact step count for “a grokking run”: unspecified besides the \(10^5\) Table 1 horizon.

Classification (one-hot / cross-entropy) is **not** implemented yet.

## What the smoke test demonstrated

A **300-step** scalar run (\(y = i+j\), decoder **1-200-200-30-1**, Adam / AdamW, full batch) trains and logs on CPU with Python 3.12.10 and PyTorch 2.5.1+cpu. That run is **not** expected to show grokking. It only checked that data, model, and logging work.

Re-run it without touching previous files under `results/` (new smoke output goes to an experiment subfolder):

```text
python src/train.py --preset smoke --seed 0
python src/evaluate.py --results-dir results/smoke/seed0_dlr0.001_dwd0
```

Equivalent without the preset (same defaults):

```text
python src/train.py --task scalar --steps 300 --seed 0 --experiment smoke
```

If that folder already exists, the trainer refuses to overwrite unless you pass `--overwrite`.

## What the next experiment is testing

**Paper-style regression**, not a hyperparameter sweep.

Fixed: \(p=10\), 45/10 split, 1D embeddings, MLP 1-200-200-30, Adam embeddings at \(10^{-3}\) and WD 0, init \(s=1\), batch 45, ReLU, MSE on frozen \(Y_c \in \mathbb{R}^{30}\).

Varied (framework only; first run uses one value each):

- decoder learning rate
- decoder weight decay
- random seed
- number of training steps

The first controlled command below is **one** seed, **one** decoder LR, **one** decoder WD, **5000** steps. That is longer than the smoke test and much shorter than Table 1’s \(10^5\) steps. Do not treat a “confusion”/“memorization” tag as Table-1-exact unless you later train for \(10^5\) steps.

## How to reproduce every result

From `grokking-reproduction/` with the existing venv (do not reinstall packages unless you need to):

```text
python src/train.py --preset smoke --seed 0
python src/evaluate.py --results-dir results/smoke/seed0_dlr0.001_dwd0
```

```text
python src/run_experiment.py --name first_controlled --task regression --decoder-lrs 0.001 --decoder-wds 0.0 --seeds 0 --steps 5000
python src/evaluate.py --results-dir results/first_controlled/seed0_dlr0.001_dwd0
```

Each run writes to `results/<experiment>/seed{seed}_dlr{lr}_dwd{wd}/`:

- `config.json`, `summary.json`, `metrics.csv`, `checkpoint.pt`
- after evaluate: loss/accuracy plots and `eval_summary.json`

`run_experiment.py` also writes `results/<name>/index.csv`.

To vary one knob later (still not a full Figure 6 grid), pass extra values, for example `--decoder-wds 0.0 1.0` or `--seeds 0 1`.
