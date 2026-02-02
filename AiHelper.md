# MedImgAIAnalyzer 前端概览

## 项目定位
这是一个医疗影像 AI 分析系统的前端代码仓库（Vue 3 + Vite + TypeScript），用于完成从项目管理、影像预处理、AI 分析、三维重建到大模型问诊的整体流程展示与交互。

## 当前实现的核心功能
- 项目管理：
  - 获取项目列表、创建项目、查看详情、修改备注、删除项目。
  - 通过项目 UUID 进入项目视图。
- 项目视图：
  - 展示 info.json 与 project.json 的基础信息（开发者模式）。
  - 预处理模块已实现主要交互逻辑。
- 预处理模块（重点）：
  - 未上传阶段：支持选择 PNG/NPZ/标注 NPZ/NII/DCM，批量上传并显示进度；可取消初始化；确认后触发初始化并轮询状态。
  - 已上传阶段：PNG 序列播放器位于图像上方；支持滑杆切换与播放；支持下载转换。
  - 裁切显示：裁切模式显示完整图像并以遮罩标出裁切区域；非裁切模式仅展示裁切后内容。
  - 标注模式（markednpz）：可叠加标注 PNG，并提供滤镜色调选项（红/蓝/绿/彩色/关闭）；标注渲染通过遮罩保持 alpha 通道，仅改变色调。

## 技术栈与依赖
- Vue 3 + Vite + TypeScript
- 状态管理：Pinia
- UI 组件：Naive UI
- 图标：xicons（Tabler 等）

## 后端接口约定
- 统一前缀：/api
- 项目列表：/api/projects/info.json
- 项目配置：/api/projects/{uuid}/project.json
- 上传：/api/project/{uuid}/upload
- 初始化：/api/project/{uuid}/inited
- PNG 列表与下载：/api/project/{uuid}/png、/download/*

## 现状说明
- Ai 分析、三维重建、Ai 问诊模块当前为占位（开发中）。
- 预处理模块已完成大部分流程，可作为后续功能扩展的基础。

