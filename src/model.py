"""Toy model: embeddings + sum + MLP decoder.

Paper architecture (Section 2 and Appendix G):

    (i, j)  |->  Dec(E_i + E_j)

* Trainable embeddings for integers 0..p-1.
* Embedding dimension d_in = 1 for the 1D toy addition setup.
* Decoder MLP width 1 -> 200 -> 200 -> 30 (Appendix G).
* Embeddings initialized Uniform[-s/2, s/2], default s = 1 (Appendix G).
* Addition of E_i and E_j is hard-coded (Section 4.1 / Appendix G).

Not specified in the paper:

* Hidden activations. We use ReLU.
* Decoder (Linear) initialization. We keep PyTorch defaults.
* How a scalar-sum head is attached. The smoke-test model keeps an extra
  30 -> 1 map so the original 300-step run is unchanged.
"""

from __future__ import annotations

import torch
from torch import nn


class ToyAdder(nn.Module):
    def __init__(
        self,
        n_tokens: int = 10,
        embed_dim: int = 1,
        init_scale: float = 1.0,
        output_dim: int = 1,
    ):
        super().__init__()
        self.embed_dim = embed_dim
        self.output_dim = output_dim
        self.embedding = nn.Embedding(n_tokens, embed_dim)
        # Appendix G: components ~ Uniform[-s/2, s/2] with default s = 1.
        nn.init.uniform_(self.embedding.weight, a=-init_scale / 2.0, b=init_scale / 2.0)

        # Paper widths: 1 -> 200 -> 200 -> 30.
        hidden = [embed_dim, 200, 200, 30]
        layers: list[nn.Module] = []
        for idx, (in_dim, out_dim) in enumerate(zip(hidden[:-1], hidden[1:])):
            layers.append(nn.Linear(in_dim, out_dim))
            is_last_paper_layer = idx == len(hidden) - 2
            if not is_last_paper_layer:
                layers.append(nn.ReLU())  # assumption: paper does not name the nonlinearity
            elif output_dim == 1:
                # Smoke-test scalar head. Not in the paper; kept for reproducibility.
                layers.append(nn.ReLU())
                layers.append(nn.Linear(hidden[-1], 1))
            elif output_dim != hidden[-1]:
                raise ValueError(
                    f"Paper decoder ends at width {hidden[-1]}; got output_dim={output_dim}."
                )
            # Regression: last paper layer is Linear(200, 30) with no output activation.
        self.decoder = nn.Sequential(*layers)

    def forward(self, i: torch.Tensor, j: torch.Tensor) -> torch.Tensor:
        e_i = self.embedding(i)
        e_j = self.embedding(j)
        h = e_i + e_j  # hard-coded addition (Section 4.1)
        out = self.decoder(h)
        if self.output_dim == 1:
            return out.squeeze(-1)
        return out
