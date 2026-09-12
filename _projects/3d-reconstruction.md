---
layout: default
title: "3D 物体外观和交互重建"
description: "基于实拍视频的外观与交互一对一重建：32 项可交互 USD 资产 × Newton 物理仿真"
---

# 3D 物体外观和交互重建 · 实物 ↔ 重建一对一对比

**个人项目** · 2026.09

## 项目概述

以手机实拍的外观/交互视频为唯一依据，对 32 个日常物体（收纳柜与桌几、座椅与软体家具、照明与家居杂项、厨房电器、数码外设、包装与容器、厨房餐具与用具 共 7 类）进行**外观与交互的一对一重建**：为每项构建带原生 USD Physics 关节的可仿真 USD 资产，在 Newton（SolverMuJoCo）中复现真实交互动作，并产出逐视角的外观对照图与左右并置的交互对比视频。

## 关键数字

- 覆盖物品: **32** 项（item_001 ~ item_032）
- 外观一对一对比图: **32** 张（多视角、5:5 无文字规范化）
- 交互对比视频: **31** 支（Newton 录制 ↔ 实物录像，720p、严格 5:5）
- 全部资产通过 Newton 物理检查（累计 240+ 项主检查）

## 技术栈

`USD / USDZ` `Newton (SolverMuJoCo)` `Blender` `FFmpeg` `Python` `视频驱动重建` `Real2Sim`

## 对比内容

- **外观对比**：每项 3~4 个与实物录像帧逐角度对应的一对一视图，统一 1280px 宽、左实物｜右重建严格 5:5、图内无文字。
- **交互对比**：左屏为 Newton 重建交互录制，右屏为实物交互录像；直向拍摄的实物视频以同源画面模糊填充补齐至等宽，保持原生比例。

<a href="/assets/projects/3d-reconstruction/index.html" target="_blank" rel="noopener"
   style="display:inline-block;margin:.6rem 0 1.2rem;padding:.7rem 1.4rem;border-radius:10px;
          background:linear-gradient(135deg,#1a6fb5 0%,#0d9488 100%);color:#fff;font-weight:600;
          text-decoration:none">▶ 打开完整对比报告（32 图 + 31 视频）</a>

## 预览

![item_032 炒锅与玻璃锅盖 · 外观对比](/assets/projects/3d-reconstruction/外观对比/item_032_外观对比.jpg)

![item_014 微波炉 · 外观对比](/assets/projects/3d-reconstruction/外观对比/item_014_外观对比.jpg)

![item_025 薯片袋 · 外观对比](/assets/projects/3d-reconstruction/外观对比/item_025_外观对比.jpg)

## 内嵌报告

<div style="position:relative;width:100%;border:1px solid #e5e2db;border-radius:10px;overflow:hidden">
<iframe src="/assets/projects/3d-reconstruction/index.html" loading="lazy"
        style="width:100%;height:820px;border:0" title="3D 重建对比报告"></iframe>
</div>

> 未经实物尺寸、质量、力学参数与相机标定，为基于视频的可交互重建，非计量级数字孪生。
