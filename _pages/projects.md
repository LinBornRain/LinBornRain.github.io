---
layout: default
title: "Projects | 林嘉豪"
permalink: /projects/
---

# 项目经历

## 3D 物体外观和交互重建

**个人项目** · 2026.09

以手机实拍的外观/交互视频为唯一依据，对 32 个日常物体（收纳柜与桌几、家具与家居用品、厨房电器、数码外设、包装与容器、厨房餐具与用具 共 6 类）进行外观与交互的一对一重建。

- 每项构建带原生 USD Physics 关节的可仿真 USD/USDZ 资产，在 Newton（SolverMuJoCo）中复现真实交互动作
- 外观对比：按类目分块、每屏并排 4 个物体，每个展示 1×N 纵向多视角对比图（左实物｜右重建，严格 5:5）
- 交互对比：31 支**上下对比**视频（上实物录像 / 下 Newton 重建），1280×1440，等比填充不裁不拉伸
- 累计 240+ 项 Newton 物理检查通过

**技术栈**: `USD / USDZ` `Newton` `SolverMuJoCo` `Blender` `FFmpeg` `Python` `Real2Sim`

→ [打开完整对比报告（32 图 + 31 视频）](/assets/projects/3d-reconstruction/index.html) · [项目页](/projects/3d-reconstruction/)

---

## 柔性物体（面料）操作场景的仿真引擎及系统搭建

**杰克科技 / 艾图机器人** · 2026.03 ~ 至今

主导建设柔性物体操作数据飞轮基础设施，实现"真实采集 → 仿真重建 → 合成数据生成 → VLA评估与训练"闭环。

- Isaac Sim + Newton 仿真引擎联调，攻克布料动态仿真与机械臂刚体物理耦合难点
- 3DGS 点云重建管线，支持 Isaac Sim 导入渲染
- 融合 Genie Sim 框架，LLM+MCP 驱动资产构建与场景生成
- ROS + Piper 真机数据采集，域随机化 + SoftMimicGen 合成数据生成
- VLA 推理管线打通，Docker 工程化封装，支持分布式训练与规模化并行评估

**技术栈**: `Newton` `Isaac Sim` `3DGS` `ROS2` `SoftMimicGen` `Docker`

→ [详细文章](/projects/embodied-ops/)

---

## 真实柔性物体 Real2Sim 物理仿真系统

**杰克科技 / 艾图机器人** · 2026.03 ~ 至今

从 0 到 1 搭建柔性面料 Real2Sim 高精度物理仿真与物理参数优化系统。

- 搭建完整软硬件仿真实验台架：Piper 臂 + Orbbec 深度相机 + Newton VBD 求解器
- 真机基本功：手眼标定、ROS 轨迹记录回放、相机时间戳对齐
- 高精度点云处理链路：SAM3 自动分割 + 点云重建 + 离群点滤波
- 设计 5 维复合 Loss 函数量化布料 3D 形态、2D 边界与轮廓的虚实偏差
- Ray.Tune 并行搜参 + Optuna 贝叶斯框架调优 10+ 维核心物理参数
- 较默认参数仿真虚实对齐精度提升 **~20%**

**技术栈**: `Newton` `VBD` `ROS2` `SAM3` `Ray.Tune` `Optuna` `CMA-ES`

→ [详细文章](/projects/real2sim/)

---

## 机器人仿真平台基建及具身操作策略强化学习训练

**国电南瑞 / 国网瑞嘉** · 2025.05 ~ 2026.02

搭建完整的具身操作仿真基础设施，实现数字孪生 → 策略训练 → 数据生成 → 评估验证的研发闭环。

- Isaac Sim 搭建绝缘子抓放完整业务场景（UR5e + 2F-85 夹爪）
- Isaac Lab + PPO 强化学习训练框架，抓取成功率 **93%**，放置成功率 **82%**
- 域随机化方案生成 LeRobot 格式合成数据集（100+ 条轨迹）
- 自学手搓柔性触觉传感器原型，探索视觉-触觉融合感知

**技术栈**: `Isaac Sim` `Isaac Lab` `PPO` `LeRobot` `Ray Tune`

→ [详细文章](/projects/embodied-ops/)

---

## 基于强化学习的汽车智能底盘制动控制系统 (ABS)

**南栖仙策** · 2023.06 ~ 2024.06

从 0 到 1 完成基于强化学习的 ABS 控制系统研发，构建数字孪生 → 策略训练 → 实车验证闭环。

- Simulink + Amesim 搭建车辆动力学与液压制动数字孪生环境
- 设计四轮独立增压/保压/减压的动作空间和强化学习奖励函数
- 基于 GNN 构建"下一帧状态预测器"用于数据驱动仿真训练
- 实车部署 VV5：城市中速制动距离减小 3%，车身偏转减小 **83.8%**

**技术栈**: `Amesim` `Simulink` `PPO` `Offline RL` `GAIL` `GNN`

→ [详细文章](/projects/abs/)

---

## 混动电控单元标定 · Offline RL 优化

**南栖仙策** · 2021.06 ~ 2022.08

以 WLTC 为目标工况，验证 Model-based Offline RL 在汽车混动标定问题上的有效性。

- 构建 P1P3 串并联混动架构的环境动力学模型
- 设计模式切换智能体，以电平衡下累计油耗最低为目标
- 虚拟环境 + 实车验证：WLTC 工况油耗优化 **0.9%**

**技术栈**: `Offline RL` `Model-based RL` `无梯度参数优化`

→ [详细文章](/projects/geely-hybrid/)

---

## 模仿学习研究：应对专家样本不完美的模仿学习方法

**网易伏羲 AI 实验室** · 2018.08 ~ 2019.03

研究专家演示数据包含失败轨迹场景下的模仿学习问题，提出利用失败样本提升策略学习效果的增量式模仿学习方法。发表 **AAAI 2020** 论文。

**技术栈**: `GAIL` `Imitation Learning` `MuJoCo`

→ [论文](/publications/)
