# FunASR 本地 STT 服务

本文件夹提供基于 FunASR 的本地语音转文字（STT）服务。

前提条件
- Python 3.8+
- 请根据 CPU/GPU 单独安装 PyTorch：
  - CPU:
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
  - CUDA 11.8:
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

安装
  pip install -r requirements.txt

运行一次性本地转写
  python transcribe.py /path/to/audio.wav

启动 Web 服务
  python app.py

HTTP 接口
  POST http://localhost:5000/transcribe
  表单字段：audio（文件）

环境变量
- FUNASR_ASR_MODEL
- FUNASR_VAD_MODEL
- FUNASR_PUNC_MODEL

默认值与 ModelScope 中常用的中文模型相匹配。
# FunASR 本地 STT 服务

本文件夹提供基于 FunASR 的本地语音转文字（STT）服务。

前提条件
- Python 3.8+
- 请根据 CPU/GPU 单独安装 PyTorch：
  - CPU:
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
  - CUDA 11.8:
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

安装
  pip install -r requirements.txt

运行一次性本地转写
  python transcribe.py /path/to/audio.wav

启动 Web 服务
  python app.py

HTTP 接口
  POST http://localhost:5000/transcribe
  表单字段：audio（文件）

环境变量
- FUNASR_ASR_MODEL
- FUNASR_VAD_MODEL
- FUNASR_PUNC_MODEL

默认值与 ModelScope 中常用的中文模型相匹