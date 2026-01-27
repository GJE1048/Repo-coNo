import os
import sys

from funasr import AutoModel

DEFAULT_ASR_MODEL = "iic/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-pytorch"
DEFAULT_VAD_MODEL = "iic/speech_fsmn_vad_zh-cn-16k-common-pytorch"
DEFAULT_PUNC_MODEL = "iic/punc_ct-transformer_cn-en-common-vocab471067-large"


def build_model() -> AutoModel:
    return AutoModel(
        model=os.environ.get("FUNASR_ASR_MODEL", DEFAULT_ASR_MODEL),
        vad_model=os.environ.get("FUNASR_VAD_MODEL", DEFAULT_VAD_MODEL),
        punc_model=os.environ.get("FUNASR_PUNC_MODEL", DEFAULT_PUNC_MODEL),
    )


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python transcribe.py /path/to/audio.wav")
        return 1

    audio_path = sys.argv[1]
    if not os.path.exists(audio_path):
        print(f"Audio file not found: {audio_path}")
        return 1

    model = build_model()
    result = model.generate(input=audio_path)
    text = ""
    if isinstance(result, list) and result:
        text = result[0].get("text", "")
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
