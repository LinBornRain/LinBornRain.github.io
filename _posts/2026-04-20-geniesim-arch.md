---
layout: default
title: "从 Isaac Sim 到 MuJoCo：Genie Sim 双引擎架构解析"
date: 2026-04-20
---

Genie Sim 3.0 采用 Isaac Sim + MuJoCo 双引擎架构，本文解析其设计思路。

## 为什么双引擎？

- **Isaac Sim**：高保真渲染 + USD 场景管理 + ROS2 集成
- **MuJoCo**：高性能物理仿真 + RL 训练友好

两者互补：Isaac Sim 负责传感器仿真和数据采集，MuJoCo 负责大规模并行 RL 训练。

## 关键组件

1. APICore：机器人控制器抽象层
2. TaskManager：任务调度与状态管理
3. UIBuilder：可视化调试界面
4. RLinf：RL 训练集成

## 机器人支持

G1（人形）和 G2（双臂）两种形态，URDF 和配置文件在 `source/geniesim/app/robot_cfg/` 下。
