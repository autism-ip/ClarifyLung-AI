# ClarifyLung-AI

AI-assisted lung X-ray classification with a Next.js frontend and BFF API. The inference service lives in a separate repository, and model weights are stored on Hugging Face. History and user data are stored in Supabase.

## Features
- Image upload with real-time inference results and confidence distribution
- Grad-CAM visualizations returned as URLs
- Inference history and detail views
- Rate-limited API endpoints

## Architecture
```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'fontSize': '18px', 'nodePadding': 26, 'clusterPadding': 24, 'lineColor': '#94A3B8', 'primaryColor': '#F8FAFC', 'primaryTextColor': '#0F172A', 'primaryBorderColor': '#CBD5F5', 'secondaryColor': '#F1F5FF', 'tertiaryColor': '#ECFDF3' }, 'flowchart': { 'nodeSpacing': 64, 'rankSpacing': 90, 'curve': 'basis' }}}%%
flowchart TB
  classDef client fill:#F8FAFC,stroke:#B4C2FF,stroke-width:1.6px,color:#0F172A,rx:14,ry:14;
  classDef api fill:#EEF2FF,stroke:#91A4FF,stroke-width:1.6px,color:#1E1B4B,rx:14,ry:14;
  classDef svc fill:#ECFDF3,stroke:#86E7C7,stroke-width:1.6px,color:#064E3B,rx:14,ry:14;
  classDef data fill:#FFF7ED,stroke:#F7A861,stroke-width:1.6px,color:#3F200B,rx:14,ry:14;

  user((User)):::client
  subgraph Web["Web App (Next.js)"]
    fe[Frontend UI]:::client
    bff[API/BFF Routes]:::api
  end

  subgraph Inference["Inference Service (FastAPI)"]
    infer[/POST /predict/]:::svc
    model[PyTorch Hybrid Model]:::svc
    vis[Grad-CAM Artifacts]:::svc
  end

  supabase[(Supabase)]:::data

  user --> fe
  fe -->|multipart upload| bff
  bff -->|proxy request| infer
  infer --> model
  model --> infer
  infer -->|gradcam_url| vis
  infer -->|result payload| bff
  bff -->|history write/read| supabase
  bff --> fe
```

## Repository Structure (This Repo)
- `src/` Frontend UI and API routes (Next.js App Router)
- `supabase/` Supabase config and migrations

Inference Service Repo:
- `ClarifyLung-AI-Inference-Service` (separate GitHub repository)
- Weights: `Zenyep/ClarifyLung-AI` on Hugging Face

## API Contract
`POST /predict` (inference service)
```json
{
  "classification": "benign",
  "confidence": 0.9963,
  "probabilities": {
    "normal": 0.0036,
    "benign": 0.9963,
    "malignant": 0.00004
  },
  "gradcam_url": "https://.../static/visualizations/gradcam_xxx.png",
  "attention_url": null
}
```

## Local Development
```powershell
npm install
npm run dev
```

## Deployment

### Frontend/BFF (Next.js)
Set the inference endpoint to your HF Space runtime URL:
```
INFERENCE_API_URL=https://zenyep-clarifylung-ai-inference-service.hf.space/predict
```

## Environment Variables
Frontend/BFF:
- `INFERENCE_API_URL`
- `INFERENCE_API_KEY` (optional)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Inference service configuration lives in the separate repo and HF Space.

## Notes
This project is for research and demonstration purposes and is not intended for clinical use.
