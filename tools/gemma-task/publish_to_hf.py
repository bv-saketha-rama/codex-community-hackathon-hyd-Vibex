import argparse
import hashlib
import json
from pathlib import Path

from huggingface_hub import HfApi


def sha256_for_file(path: Path):
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser(
        description="Upload a converted .task bundle and manifest to a gated Hugging Face repo."
    )
    parser.add_argument("--repo-id", required=True, help="Target HF repo, for example owner/vibex-gemma-task.")
    parser.add_argument("--task-file", required=True, help="Local path to the .task bundle.")
    parser.add_argument("--token", required=True, help="HF write token.")
    parser.add_argument("--manifest-output", required=True, help="Local file path for the generated manifest JSON.")
    parser.add_argument("--artifact-path", default="android/gemma-4-e4b-it.task", help="Repo path for the uploaded task file.")
    parser.add_argument("--model-id", default="gemma-4-e4b-it-android")
    parser.add_argument("--version", default="dev-preview")
    args = parser.parse_args()

    task_file = Path(args.task_file).resolve()
    manifest_output = Path(args.manifest_output).resolve()
    manifest_output.parent.mkdir(parents=True, exist_ok=True)

    if not task_file.exists():
        raise FileNotFoundError(f"Missing task bundle: {task_file}")

    checksum = sha256_for_file(task_file)
    size = task_file.stat().st_size
    api = HfApi(token=args.token)

    api.upload_file(
        path_or_fileobj=str(task_file),
        path_in_repo=args.artifact_path,
        repo_id=args.repo_id,
        repo_type="model",
    )

    artifact_url = f"https://huggingface.co/{args.repo_id}/resolve/main/{args.artifact_path}"
    manifest = {
        "modelId": args.model_id,
        "version": args.version,
        "sourceUrl": artifact_url,
        "checksum": checksum,
        "totalBytes": size,
        "supportedInputs": ["text", "image", "audio"],
    }

    manifest_output.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    api.upload_file(
        path_or_fileobj=str(manifest_output),
        path_in_repo="android/model-manifest.json",
        repo_id=args.repo_id,
        repo_type="model",
    )
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
