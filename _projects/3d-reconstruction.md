---
layout: default
title: "GPT6 ASTRA直出——物体外观及交互3D重建"
description: "基于实拍视频的外观与交互一对一重建：32 项可交互 USD 资产 × Newton 物理仿真"
---

# GPT6 ASTRA直出——物体外观及交互3D重建

**个人项目** · 2026.09

## 项目概述

以手机实拍的外观/交互视频为唯一依据，对 32 个日常物体（收纳柜与桌几、家具与家居用品、厨房电器、数码外设、包装与容器、厨房餐具与用具 共 6 类）进行**外观与交互的一对一重建**：为每项构建带原生 USD Physics 关节的可仿真 USD 资产，在 Newton（SolverMuJoCo）中复现真实交互动作，并产出逐视角的外观对照图与上下对比的交互对比视频。

## 关键数字

- 覆盖物品: **32** 项（6 类）
- 外观一对一对比图: **32** 张（每项 3~4 视角，严格 5:5、图内无文字）
- 交互对比视频: **31** 支（上实物 / 下 Newton 重建，1280×1440）
- 全部资产通过 Newton 物理检查（累计 240+ 项主检查）

## 技术栈

`USD / USDZ` `Newton (SolverMuJoCo)` `Blender` `FFmpeg` `Python` `视频驱动重建` `Real2Sim`

## 对比内容

- **外观对比**：按类目分块，一屏并排 4 个物体，每个物体展示其 1×N 纵向多视角对比图（左实物｜右重建）；方向键按物体滑动，点击可查看原尺寸。
- **交互对比**：每支视频为上下对比（上＝实物交互录像，下＝Newton 重建交互录制），等比填充、不裁不拉伸；页面中同样按物体滑动浏览。

<a href="/assets/projects/3d-reconstruction/index.html" target="_blank" rel="noopener"
   style="display:inline-block;margin:.6rem 0 1.2rem;padding:.7rem 1.4rem;border-radius:10px;
          background:linear-gradient(135deg,#1a6fb5 0%,#0d9488 100%);color:#fff;font-weight:600;
          text-decoration:none">▶ 打开完整对比报告（32 组外观图 + 31 支交互视频）</a>

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
