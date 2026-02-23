# Z-Image Studio (INT8)

Z-Image Studio (INT8) 是一款基于 [**Z-Image-INT8**](https://modelscope.cn/models/iximbox/Z-Image-INT8) 模型（ModelScope）构建的现代化 Web 应用。通过直观的 UI 界面，用户只需输入自然语言 prompt 即可快速本地生成高质量的图像，整个项目采用了前后端分离的架构。

本应用致力于探索和提供 INT8 量化模型的高效推理特性，为端侧设备上的文本到图像的生成提供便利。项目后端基于 FastAPI 构建，前端使用 React + Vite 驱动。

![Z-Image Studio Snapshot](./snapshot.png)

---

## ✨ 核心特性

- **🚀 快速本地推理**：集成 `iximbox/Z-Image-INT8` 大模型，享受量化后的低功耗流式推断体验。
- **💻 现代化前端 UI**：React 构建的美观界面，包含提示词输入、参数微调和历史生图画廊功能。
- **🔌 稳定的后台服务**：利用 FastAPI、SQLite 实现异步多线程模型加载和生成任务的可靠调度。
- **🛠️ 按需调节参数**：支持自定义解析度（Width/Height）、步数（Steps）、提示词相关性（Guidance）与随机种子（Seed）。

---

## 🏗️ 架构概览

- **前端 (Frontend)**
  - 框架：React 19 + Vite
  - 语言：JavaScript/JSX
  - 核心功能：表单与参数交互、任务进度回调展示、多媒体图片浏览。
- **后端 (Backend)**
  - 框架：FastAPI, Uvicorn
  - 工具与库：PyTorch, Diffusers, ModelScope, Optimum-Quanto, SQLAlchemy
  - 核心功能：处理前端 API 请求、管理 SQLite 任务状态、后台独立线程加载模型、运行推理任务并返回结果。

---

## 🚀 快速开始

### 前提要求

确保您的环境已安装：
- **Node.js** (推荐 v18+)
- **Python** (推荐 3.10+)
- 建议在一台配有 NVIDIA 显卡或 Apple M 系列芯片的机器上运行，以获得最佳推理性能。

### 1. 克隆项目
```bash
git clone https://github.com/iXimNet/Z-Image-INT8-Studio.git
cd Z-Image-INT8-Studio
```

### 2. 启动后端

进入 `backend` 目录，安装依赖并在本地运行主服务：

```bash
cd backend

# (建议) 创建虚拟环境
python -m venv venv
# 激活虚拟环境 (Windows)
# venv\Scripts\activate
# 激活虚拟环境 (macOS/Linux)
# source venv/bin/activate

# 安装需求包
pip install -r requirements.txt

# 启动服务端
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
> **注意**：初次启动后端时，它会在后台自动从 ModelScope 下载 `iximbox/Z-Image-INT8` 并加载模型权重。

### 3. 启动前端

打开一个新的终端，进入 `frontend` 目录：

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务成功启动后，浏览器将自动打开或提供一个类似 `http://localhost:5173` 的本地地址供您访问。

### 4. 一键启动（可选）

如果您需要反复运行该项目且希望两个服务能在同一个终端中同时输出，我们提供了快捷启动脚本：

- **Windows**: 在命令行中运行 `start.bat` 或是双击打开该文件。
- **macOS / Linux**: 在终端中为脚本赋予运行权限，然后执行 `./start.sh`。

```bash
chmod +x start.sh
./start.sh
```

脚本将自动依次启动后端和前端服务，并在准备就绪后打开默认的浏览器访问应用（`http://localhost:5173`）。关闭该终端窗口或按下 `Ctrl+C` 即可同步终止服务。

---

## 📂 目录结构

```text
Z-Image-INT8-Studio/
├── backend/                  # 后端服务代码
│   ├── main.py               # FastAPI 入口
│   ├── model.py              # Z-Image 模型封装
│   ├── routes.py             # HTTP 接口路由定义
│   ├── database.py           # SQLite 数据存储配置
│   ├── requirements.txt      # Python 依赖
│   └── output_images/        # 生成的图像文件存放路径 (运行时生成)
├── frontend/                 # 前端服务代码
│   ├── src/                  # React 源代码组件
│   ├── public/               # 公开静态资源
│   ├── package.json          # Node.js 依赖及构建脚本
│   └── vite.config.js        # Vite 配置
├── .gitignore                # Git 忽略配置
└── README.md                 # 项目文档
```

---

## 📜 许可证

本项目所涉及的技术与衍生代码受相应开源许可证约束。使用 **Z-Image-INT8** 等内容请遵照 ModelScope/Apache-2.0 及原模型（`Tongyi-MAI/Z-Image`）的许可协议。

**Powered by [Z-Image-INT8](https://modelscope.cn/models/iximbox/Z-Image-INT8) · [Tongyi-MAI](https://www.modelscope.cn/organization/Tongyi-MAI)**
