import os
import tempfile

from flask import Flask, jsonify, request
from funasr import AutoModel

DEFAULT_ASR_MODEL = "iic/speech_paraformer-large_asr_nat-zh-cn-16k-common-vocab8404-pytorch"
DEFAULT_VAD_MODEL = "iic/speech_fsmn_vad_zh-cn-16k-common-pytorch"
DEFAULT_PUNC_MODEL = "iic/punc_ct-transformer_cn-en-common-vocab471067-large"

app = Flask(__name__)
model = AutoModel(
    model=os.environ.get("FUNASR_ASR_MODEL", DEFAULT_ASR_MODEL),
    vad_model=os.environ.get("FUNASR_VAD_MODEL", DEFAULT_VAD_MODEL),
    punc_model=os.environ.get("FUNASR_PUNC_MODEL", DEFAULT_PUNC_MODEL),
)


@app.post("/transcribe")
def transcribe():
    if "audio" not in request.files:
        return jsonify({"error": "missing audio file"}), 400

    audio_file = request.files["audio"]
    if not audio_file.filename:
        return jsonify({"error": "empty filename"}), 400

    _, ext = os.path.splitext(audio_file.filename)
    suffix = ext if ext else ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as temp:
        audio_file.save(temp.name)
        result = model.generate(input=temp.name)

    text = ""
    if isinstance(result, list) and result:
        text = result[0].get("text", "")

    return jsonify({"text": text})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")))
