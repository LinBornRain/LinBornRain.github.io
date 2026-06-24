---
layout: default
title: "具身操作仿真平台 · RL训练与数据生成"
description: "基于Isaac Sim搭建具身操作仿真环境，PPO强化学习训练，合成数据生成"
---

# 具身操作仿真平台 · 强化学习训练与数据生成

**国电南瑞 / 国网瑞嘉** · 2025.05 ~ 2026.02

## 项目概述

搭建完整的具身操作仿真基础设施，实现"数字孪生 → 策略训练 → 数据生成 → 评估验证"的研发闭环，支撑机器人操作任务快速验证与迭代。

## 技术栈

`Isaac Sim` `Isaac Lab` `PPO` `LeRobot` `Ray Tune` `HDF5` `USD`

## 核心指标

- 抓取成功率: **93%**
- 放置成功率: **82%**
- 合成数据: **100+** 条轨迹

## 技术链路

### 1. 仿真搭建
- Isaac Sim 搭建绝缘子抓放完整业务场景
- UR5e 机械臂 + 2F-85 夹爪 + 绝缘子/挂钩/台面资产
- Contact Sensor 碰撞检测

### 2. 策略训练
- Isaac Lab + PPO (rsl_rl) 强化学习训练框架
- 设计状态空间、动作空间及奖励函数
- Ray Tune 超参搜索

### 3. 数据生成
- 域随机化策略生成合成数据
- LeRobot 格式轨迹数据集（多视角视图 + 实时状态 + 动作）

### 4. 评估验证
- 仿真 + 遥操作台架双重验证
- 视觉-触觉融合感知探索（自学手搓柔性触觉传感器原型）

## 演示

<video src="/assets/projects/embodied-ops/assets/rl_grasp_insulator.webm" controls width="100%"></video>

<video src="/assets/projects/embodied-ops/assets/insulator_hook.webm" controls width="100%"></video>

![数据集可视化](/assets/projects/embodied-ops/assets/dataset_viz.png)
