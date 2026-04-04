import argparse
import importlib
from pathlib import Path

from ai_edge_torch.generative.layers import kv_cache
from ai_edge_torch.generative.utilities import converter
from ai_edge_torch.generative.utilities.export_config import ExportConfig
from mediapipe.tasks.python.genai import bundler


def load_builder(module_path: str, function_name: str):
    module = importlib.import_module(module_path)
    return getattr(module, function_name)


def main():
    parser = argparse.ArgumentParser(
        description="Convert a Hugging Face Gemma checkpoint into a MediaPipe .task bundle."
    )
    parser.add_argument("--hf-model-dir", required=True, help="Local directory containing the HF model.")
    parser.add_argument("--builder-module", required=True, help="Python module that exports the builder.")
    parser.add_argument("--builder-function", required=True, help="Builder function name to call.")
    parser.add_argument("--output-dir", required=True, help="Directory to write LiteRT files into.")
    parser.add_argument("--output-prefix", default="vibex-gemma", help="LiteRT output prefix.")
    parser.add_argument("--task-output", required=True, help="Absolute path to the final .task file.")
    parser.add_argument("--prefill-seq-len", type=int, default=2048)
    parser.add_argument("--kv-cache-max-len", type=int, default=4096)
    parser.add_argument("--quantize", default="dynamic_int8")
    parser.add_argument("--tokenizer-path", help="Optional tokenizer.model path override.")
    parser.add_argument("--start-token", default="<bos>")
    parser.add_argument("--stop-token", action="append", dest="stop_tokens", default=["<eos>", "<end_of_turn>"])
    parser.add_argument("--prompt-prefix", default="<start_of_turn>user\n")
    parser.add_argument("--prompt-suffix", default="<end_of_turn>\n<start_of_turn>model\n")
    args = parser.parse_args()

    hf_model_dir = Path(args.hf_model_dir).resolve()
    output_dir = Path(args.output_dir).resolve()
    task_output = Path(args.task_output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    task_output.parent.mkdir(parents=True, exist_ok=True)

    builder = load_builder(args.builder_module, args.builder_function)
    pytorch_model = builder(str(hf_model_dir))

    export_config = ExportConfig()
    export_config.kvcache_layout = kv_cache.KV_LAYOUT_TRANSPOSED
    export_config.mask_as_input = True

    converter.convert_to_tflite(
        pytorch_model,
        output_path=str(output_dir),
        output_name_prefix=args.output_prefix,
        prefill_seq_len=args.prefill_seq_len,
        kv_cache_max_len=args.kv_cache_max_len,
        quantize=args.quantize,
        export_config=export_config,
    )

    tflite_path = output_dir / f"{args.output_prefix}_q8_ekv1280.tflite"
    tokenizer_path = (
        Path(args.tokenizer_path).resolve()
        if args.tokenizer_path
        else hf_model_dir / "tokenizer.model"
    )

    if not tflite_path.exists():
        raise FileNotFoundError(
            f"Expected LiteRT file was not found at {tflite_path}. "
            "Adjust the output prefix or update this script to match the converter output."
        )

    config = bundler.BundleConfig(
        tflite_model=str(tflite_path),
        tokenizer_model=str(tokenizer_path),
        start_token=args.start_token,
        stop_tokens=args.stop_tokens,
        output_filename=str(task_output),
        prompt_prefix=args.prompt_prefix,
        prompt_suffix=args.prompt_suffix,
    )
    bundler.create_bundle(config)
    print(f"Created task bundle at {task_output}")


if __name__ == "__main__":
    main()
