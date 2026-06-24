---
title: "Piper 机械臂控制"
description: "通过 CAN 总线控制 AgileX Piper 6-DOF 机械臂"
---

基于 piper_sdk 和 pyAgxArm 实现 AgileX Piper 机械臂的精确控制。

- 控制: CAN 总线, MIT 阻抗控制
- 路径: 裸 CAN / piper_sdk / pyAgxArm / LeRobot 四路验证
- 夹爪: 通过 move_gripper_deg/move_gripper_m 触发
