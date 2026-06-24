---
layout: default
title: "RL-ABS 智能底盘制动控制系统"
description: "从0到1完成基于强化学习的汽车ABS制动控制系统研发"
---

# 智能底盘制动控制 · 强化学习 ABS

**南栖仙策** · 2023.06 ~ 2024.06

## 项目概述

从 0 到 1 完成基于强化学习的汽车智能底盘制动模块 ABS 控制系统研发。构建从车辆动力学建模、数字孪生仿真、RL训练到实车部署验证的完整研发链路。

## 技术栈

`Amesim` `Simulink` `DQN` `PPO` `Offline RL` `GAIL` `GNN`

## 核心指标

- 车身偏转减小: **83.8%**
- 制动距离减小: **3%**
- 4 轮独立增压/保压/减压控制

## 技术链路

### 概念验证：Simulink 单轮 ABS

基于 Simulink 搭建单轮 ABS 模型，验证 DQN 电磁阀开关控制强化学习方案可行性。
对比官方模型 vs RL 模型的制动效果。

### 系统仿真：Amesim 四轮

基于 Amesim 搭建整车四轮液压制动数字孪生环境，包含电机、阀体、压力传感器、控制器等关键模块。设计四轮独立增压/保压/减压控制逻辑与执行时序。

### 实车数据仿真

采集 VV5 实车制动压力、轮速、滑移率及车身姿态等状态数据。基于 GNN 构建"下一帧状态预测器"，构建数据驱动仿真环境用于策略训练。

### 实车验证

- **VV5 直线制动**: 城市中速制动距离减小 3%，车身偏转减小 83.8%
- **VV5 弯道制动**: 弯道制动稳定性显著提升
- **广德试验场**: 高附路面 90km/h 全力制动、对接路面 55/65km/h 全力制动

## 演示

<video src="/assets/projects/abs/assets/rl_control.mp4" controls width="100%"></video>

![Simulink模型](/assets/projects/abs/assets/simulink_local_model.png)

![实车对比](/assets/projects/abs/assets/shice_speed_compare_train.png)
