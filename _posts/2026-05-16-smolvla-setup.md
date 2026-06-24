---
layout: default
title: "SmolVLA 仿真推理环境搭建指南"
date: 2026-05-16
---

记录在 LeRobot 框架中部署 SmolVLA（450M 参数）进行仿真推理的完整流程。

## 环境准备

```bash
conda create -n lerobot python=3.10 -y
conda activate lerobot
pip install -e .[smolvla]
```

## 模型加载

SmolVLA 基于 SmolLM2 架构，450M 参数，推理仅需 0.87GB 显存。支持 6D 状态 + 3 相机视角 + 自然语言指令输入，输出 6D 动作。

## 关键坑点

1. `attention_mask` 必须为 `bool` 类型
2. state/image 不含时间维度
3. Groot bug 需绕过——缺 `num2words` 包

## 参考

- LeRobot 官方文档
- SmolVLA 论文
