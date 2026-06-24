---
layout: default
title: "Real2Sim 柔性布料物理仿真系统"
description: "从0到1搭建柔性面料Real2Sim高精度物理仿真与物理参数优化系统"
---

# Real2Sim · 柔性布料物理仿真参数无梯度优化

**杰克科技 / 艾图机器人** · 2026.03 ~ 至今

## 项目概述

从 0 到 1 搭建端到端柔性面料 Real2Sim 高精度物理仿真与物理参数优化系统。通过视觉处理、仿真建模与机器学习的扎实工程基本功，构建"真机采集 → 点云处理 → 虚实量化评估 → 物理参数迭代"的标准化工程流程。

## 技术栈

`Newton` `VBD` `ROS2` `SAM3` `Ray.Tune` `Optuna` `CMA-ES`

## 硬件平台

- **松灵 Piper 机械臂** — 末端夹持布料执行标准化动作轨迹
- **Orbbec 335L 深度相机** — 从侧面捕获布料 3D 点云数据
- **NICE 蓝色 POLO 面料** — 标准化可复现的柔性物体测试样本

## 技术链路

### 阶段一：Real2Sim 实验平台搭建

搭建完整柔性物体软硬件仿真实验台架：基于 Piper 臂与 Orbbec 深度相机、Newton 引擎和 VBD 求解器构建实验平台。完成手眼标定、ROS 轨迹记录回放、相机时间戳对齐。

### 阶段二：真实布料点云的仿真映射

构建高精度点云处理链路：SAM3 自动分割与点云重建，对噪声点云进行离群点滤波处理。

### 阶段三：仿真与真实差异量化

设计 5 维复合 Loss 函数全方位量化布料 3D 形态、2D 边界与轮廓的虚实偏差，并完成归一化评估。

### 阶段四：搜索执行与效果验证

基于 Ray.Tune 实现并行搜参，基于 Optuna 贝叶斯框架 + CMA-ES 调优刚度、阻尼等 10+ 维核心物理参数。

## 项目成果

- 较默认参数仿真虚实对齐精度提升 **~20%**
- 解决传统人工调参效率低、精度有限、参数耦合难以全局最优的痛点
- 沉淀柔体 Real2Sim 标准化工程流程

## 演示

<video src="/assets/projects/real2sim/assets/demo1.mp4" controls width="100%"></video>

![虚实对比](/assets/projects/real2sim/assets/comparison.png)

![Loss曲线](/assets/projects/real2sim/assets/loss_comparison.png)
