from __future__ import annotations

import base64
import io
import os
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

import numpy as np
import torch
from PIL import Image


@dataclass
class VisualizationConfig:
    return_type: str = "data_url"  # "data_url" or "file"
    output_dir: str = "visualizations"
    image_format: str = "png"
    overlay_alpha: float = 0.45
    max_size: int = 512


@dataclass
class VisualizationArtifact:
    kind: str
    data_url: Optional[str] = None
    file_path: Optional[str] = None


def _normalize_image_tensor(image_tensor: torch.Tensor) -> torch.Tensor:
    if image_tensor.dim() == 4:
        image_tensor = image_tensor[0]
    image_tensor = image_tensor.detach().cpu()
    image_tensor = image_tensor - image_tensor.min()
    denom = image_tensor.max() - image_tensor.min()
    if denom > 0:
        image_tensor = image_tensor / denom
    return image_tensor.clamp(0, 1)


def _tensor_to_pil(image_tensor: torch.Tensor, max_size: int) -> Image.Image:
    tensor = _normalize_image_tensor(image_tensor)
    if tensor.size(0) == 1:
        tensor = tensor.repeat(3, 1, 1)
    img = (tensor.permute(1, 2, 0).numpy() * 255.0).astype(np.uint8)
    pil = Image.fromarray(img)
    if max(pil.size) > max_size:
        pil.thumbnail((max_size, max_size), Image.BILINEAR)
    return pil


def _simple_colormap(mask: np.ndarray) -> np.ndarray:
    mask = np.clip(mask, 0, 1)
    r = np.clip(1.5 - np.abs(4.0 * mask - 3.0), 0, 1)
    g = np.clip(1.5 - np.abs(4.0 * mask - 2.0), 0, 1)
    b = np.clip(1.5 - np.abs(4.0 * mask - 1.0), 0, 1)
    return np.stack([r, g, b], axis=-1)


def _overlay_heatmap(base: Image.Image, heatmap: np.ndarray, alpha: float) -> Image.Image:
    heatmap_rgb = (_simple_colormap(heatmap) * 255.0).astype(np.uint8)
    heat = Image.fromarray(heatmap_rgb).resize(base.size, Image.BILINEAR)
    return Image.blend(base.convert("RGB"), heat.convert("RGB"), alpha)


def _encode_image(image: Image.Image, image_format: str) -> str:
    buf = io.BytesIO()
    image.save(buf, format=image_format.upper())
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _build_data_url(image: Image.Image, image_format: str) -> str:
    encoded = _encode_image(image, image_format)
    return f"data:image/{image_format.lower()};base64,{encoded}"


def _write_image(image: Image.Image, output_dir: str, name: str, image_format: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    filename = f"{name}.{image_format.lower()}"
    path = os.path.join(output_dir, filename)
    image.save(path, format=image_format.upper())
    return path


class GradCAM:
    def __init__(self, model: torch.nn.Module, target_layer: str):
        self.model = model
        self.target_layer = target_layer
        self._gradients: Optional[torch.Tensor] = None
        self._activations: Optional[torch.Tensor] = None
        self._register_hooks()

    def _register_hooks(self) -> None:
        def forward_hook(_, __, output):
            self._activations = output.detach()

        def backward_hook(_, grad_input, grad_output):
            self._gradients = grad_output[0].detach()

        for name, module in self.model.named_modules():
            if name == self.target_layer:
                module.register_forward_hook(forward_hook)
                module.register_full_backward_hook(backward_hook)
                return
        raise ValueError(f"Target layer '{self.target_layer}' not found in model.")

    def generate(self, image_tensor: torch.Tensor, target_class: Optional[int] = None) -> np.ndarray:
        self.model.eval()
        if image_tensor.dim() == 3:
            image_tensor = image_tensor.unsqueeze(0)
        image_tensor = image_tensor.clone().detach()
        image_tensor.requires_grad_(True)

        output = self.model(image_tensor)
        if target_class is None:
            target_class = int(output.argmax(dim=1).item())

        self.model.zero_grad()
        output[0, target_class].backward()

        if self._gradients is None or self._activations is None:
            raise RuntimeError("GradCAM hooks did not capture activations/gradients.")

        weights = self._gradients.mean(dim=(2, 3), keepdim=True)
        cam = (weights * self._activations).sum(dim=1, keepdim=True)
        cam = torch.relu(cam)[0, 0].detach().cpu().numpy()

        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        height, width = image_tensor.shape[-2:]
        cam_img = Image.fromarray((cam * 255.0).astype(np.uint8)).resize((width, height), Image.BILINEAR)
        return np.asarray(cam_img).astype(np.float32) / 255.0


def generate_gradcam(
    model: torch.nn.Module,
    image_tensor: torch.Tensor,
    target_layer: str,
    config: VisualizationConfig,
    target_class: Optional[int] = None,
    name: str = "gradcam",
) -> VisualizationArtifact:
    cam = GradCAM(model, target_layer)
    mask = cam.generate(image_tensor, target_class=target_class)
    base = _tensor_to_pil(image_tensor, config.max_size)
    overlay = _overlay_heatmap(base, mask, config.overlay_alpha)

    if config.return_type == "file":
        path = _write_image(overlay, config.output_dir, name, config.image_format)
        return VisualizationArtifact(kind="gradcam", file_path=path)
    return VisualizationArtifact(kind="gradcam", data_url=_build_data_url(overlay, config.image_format))


def generate_attention_overlay(
    image_tensor: torch.Tensor,
    attention_map: torch.Tensor,
    config: VisualizationConfig,
    name: str = "attention",
) -> VisualizationArtifact:
    if attention_map.dim() > 2:
        attention_map = attention_map.mean(dim=0)
    attention = attention_map.detach().cpu().numpy()
    attention = (attention - attention.min()) / (attention.max() - attention.min() + 1e-8)

    base = _tensor_to_pil(image_tensor, config.max_size)
    overlay = _overlay_heatmap(base, attention, config.overlay_alpha)

    if config.return_type == "file":
        path = _write_image(overlay, config.output_dir, name, config.image_format)
        return VisualizationArtifact(kind="attention", file_path=path)
    return VisualizationArtifact(kind="attention", data_url=_build_data_url(overlay, config.image_format))


def build_visualization_payload(
    gradcam: Optional[VisualizationArtifact],
    attention: Optional[VisualizationArtifact],
) -> Dict[str, Optional[str]]:
    return {
        "gradcam_url": gradcam.data_url if gradcam and gradcam.data_url else (gradcam.file_path if gradcam else None),
        "attention_url": attention.data_url if attention and attention.data_url else (attention.file_path if attention else None),
    }
