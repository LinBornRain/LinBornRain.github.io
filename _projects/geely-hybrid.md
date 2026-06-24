---
layout: default
title: "混动电控单元标定 · Offline RL优化"
description: "基于离线强化学习的智能混动模式切换策略优化"
---

# 混动电控单元标定 · Offline RL 优化

**南栖仙策** · 2021.06 ~ 2022.08

## 项目概述

以 WLTC 为目标工况，以控制混动模式切换和发动机输出功率为手段，以保证电平衡下累计油耗最低为目标，验证 Model-based Offline RL 技术在汽车混动标定问题上的有效性。

## 技术栈

`Offline RL` `Model-based RL` `无梯度参数优化`

## 核心成果

- WLTC 工况油耗优化: **0.9%**
- 成功验证 MBRL 在混动标定领域的工程可行性

## 技术链路

### 数据对接
客户业务场景沟通，训练数据对接

### 环境建模
- P1P3 串并联混动架构动力学建模
- 特征工程：提取关键状态变量
- 构建环境动力学模型

### 策略学习
- 模式切换智能体设计
- 优化空间定义：模式选择 + 发动机功率
- Offline RL 策略学习

### 实车验证
- 虚拟环境误差复评
- 混动策略在虚拟环境对比
- 实车验证

## 演示

![模式对比](/assets/projects/geely-hybrid/assets/mode_comparison.png)

![油耗对比](/assets/projects/geely-hybrid/assets/fuel_comparison.png)

![速度跟随](/assets/projects/geely-hybrid/assets/speed_comparison.png)
