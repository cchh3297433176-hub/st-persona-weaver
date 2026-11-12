# 🧙‍♂️ Persona Weaver (User人设生成器)

[中文] | [English](#english)

SillyTavern 原生扩展插件。旨在利用 AI 智能生成、深度润色和管理您的 User Persona（用户人设），支持智能对比编辑与世界书自动联动。

## 来源与本 Fork 的新增功能

本仓库 Fork 自 Yellows & AI 的 [Persona Weaver](https://github.com/sisisisilviaxie-star/st-persona-weaver)，基于 [原版 v3.4.6](https://github.com/sisisisilviaxie-star/st-persona-weaver/tree/40c0f753c19f91629127f08a5b72f02657ccaa9b)，沿用原项目的 MIT 许可。

**v3.5.0** 在 User 人设结果区新增「生成头像」。它读取编辑后的设定，沿用柏宝绘的「生成 tag」模型和当前出图配方，一次生成一张。头像可方形预览、重画，也可在确认后设为当前 Persona 的头像。

## ✨ 核心功能

*   **AI 智能生成**：根据简单的自然语言描述（或内置 YAML 模版），自动生成结构化、高质量的用户人设。
*   **深度润色 & 智能对比**：
    *   对现有设定不满意？输入修改意见，AI 智能重写。
    *   提供 **Diff (差异对比)** 视图，直观展示修改前后的变化，支持选择性保留或直接编辑。
*   **草稿箱系统**：自动或手动保存生成记录到草稿箱，灵感永不丢失，随时一键回填。
*   **世界书联动**：自动检测当前绑定的世界书，将设定作为条目一键写入，实现剧情深度绑定。
*   **独立 API 支持**：支持配置独立的 API（如 OpenAI、DeepSeek 等）进行后台生成，不占用主对话的上下文和模型配置。
*   **移动端适配**：优化的 UI 设计，支持手机端触摸滑动与悬浮操作。

## 📦 安装方法

1.  **前置需求**：建议安装并启用 [TavernHelper (JS-Slash-Runner)](https://github.com/n0vi028/JS-Slash-Runner) 插件以获得最佳的世界书操作体验（非强制，但推荐）。
2.  打开 SillyTavern 的 **Extensions (扩展)** 页面。
3.  点击 **Install Extension**。
4.  在 URL 栏输入本仓库地址：`https://github.com/cchh3297433176-hub/st-persona-weaver.git`
5.  点击 **Save** 并刷新页面。

已通过 Git 安装原版的用户，可在现有扩展目录中切换更新源，再刷新酒馆：

```sh
git remote set-url origin https://github.com/cchh3297433176-hub/st-persona-weaver.git
git pull --ff-only origin main
```

## 📖 使用简述

1.  安装后，输入框上方会出现 **魔棒图标** (<i class="fa-solid fa-wand-magic-sparkles"></i>)，点击即可打开面板。
2.  **生成**：在编辑页输入您的要求，点击生成。
3.  **润色**：选中生成结果中的某段文字，点击浮现的“修改”按钮，或直接在下方输入意见进行润色。
4.  **保存**：点击“保存”将结果存入草稿，或点击“覆盖当前人设”直接应用。

### 用柏宝绘生成 User 头像

启用并配置 [柏宝绘](https://github.com/baibai-git/ST-BaiBai-Image)（需要支持公开出图接口，已适配 v0.3.2）。在 User 模式生成或加载一份人设后，点击结果框下方的 **生成头像**。插件将当前结果交给柏宝绘「生成 tag」所用的模型，再按柏宝绘当前出图渠道和配方出图。

默认是头肩像，预览会居中裁成方形。满意后点击 **设为当前人设头像**，即可替换该 Persona 的图片。NovelAI 会沿用柏宝绘当前画师串。头像请求独立于聊天配图的张数设置。

---

<a name="english"></a>
## English

**Persona Weaver** is a native extension for SillyTavern that uses AI to help create, refine, and manage User Personas, with automatic World Info synchronization.

This fork is based on [Persona Weaver by Yellows & AI](https://github.com/sisisisilviaxie-star/st-persona-weaver). Version 3.5.0 adds single-image User avatar generation via [ST-BaiBai-Image](https://github.com/baibai-git/ST-BaiBai-Image), with a square preview and a separate action to apply it to the active Persona.

### ✨ Features

*   **AI Generation**: Automatically generate detailed, structured User Personas (YAML) based on simple prompts or templates.
*   **Smart Refinement & Diff View**: 
    *   Refine your persona with natural language instructions.
    *   **Smart Contrast**: Visually compare the original vs. refined text side-by-side, allowing you to selectively apply changes or edit directly.
*   **Drafts System**: Auto-save your generation history to the Drafts tab. Never lose an idea again.
*   **World Info Sync**: Automatically detects bound World Info books and allows one-click saving of your persona as an entry.
*   **Independent API**: Supports configuring a separate API (e.g., OpenAI, DeepSeek) for generation tasks, keeping your main chat context free.
*   **Mobile Friendly**: Optimized UI for touch screens and mobile devices.

### 📦 Installation

1.  **Prerequisite**: [TavernHelper (JS-Slash-Runner)](https://github.com/n0vi028/JS-Slash-Runner) is recommended for full World Info features.
2.  Open **Extensions** in SillyTavern.
3.  Click **Install Extension**.
4.  Paste the repo URL: `https://github.com/cchh3297433176-hub/st-persona-weaver.git`
5.  Click **Save** and reload.

## 📄 License

MIT License
