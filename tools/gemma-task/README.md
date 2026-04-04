# Gemma Task Tooling

These scripts support the Android on-device model flow used by Vibex.

## 1. Download the Hugging Face checkpoint

Use the Hugging Face CLI with access to the gated source model:

```bash
hf download google/gemma-4-E4B-it --local-dir ./artifacts/gemma-4-e4b-it
```

## 2. Convert to LiteRT and bundle into `.task`

The official Google conversion guide uses AI Edge Torch and MediaPipe bundling.
This repo keeps the process generic by letting you pass the builder module and function explicitly.

Example:

```bash
python tools/gemma-task/convert_to_task.py \
  --hf-model-dir ./artifacts/gemma-4-e4b-it \
  --builder-module ai_edge_torch.generative.examples.gemma3.gemma3 \
  --builder-function build_model_1b \
  --output-dir ./artifacts/litert \
  --output-prefix vibex-gemma \
  --task-output ./artifacts/vibex-gemma.task
```

Replace the builder module/function with the AI Edge Torch builder that matches the Gemma checkpoint you are converting.

## 3. Publish the Android artifact to Hugging Face

```bash
python tools/gemma-task/publish_to_hf.py \
  --repo-id your-org/vibex-gemma-task \
  --task-file ./artifacts/vibex-gemma.task \
  --token $HF_TOKEN \
  --manifest-output ./artifacts/model-manifest.json
```

Then copy the generated manifest values into `front-end/.env.local`:

- `EXPO_PUBLIC_GEMMA_MODEL_URL`
- `EXPO_PUBLIC_GEMMA_MODEL_CHECKSUM`
- `EXPO_PUBLIC_GEMMA_MODEL_SIZE_BYTES`
- `EXPO_PUBLIC_HF_OAUTH_CLIENT_ID`
