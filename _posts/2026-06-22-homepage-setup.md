---
layout: default
title: "个人主页搭建记录"
date: 2026-06-22
---

基于 al-folio 框架搭建个人学术主页，并融入了小米 MiMo 风格的 Hero 交互设计。

### 技术栈

- **框架**: Jekyll 4.x (al-folio inspired)
- **Hero**: 纯 CSS 纹理矩阵 + 3D 翻转卡片 + clip-path 鼠标跟随
- **部署**: GitHub Pages (wzljhboy.github.io)

### Hero 特性

1. 背景纹理矩阵：「林 雨 生」× 12 行 × 20 列，5% 透明度
2. 双面翻转卡片：正面 ⇄ 背面 About Me
3. 鼠标挖洞效果：`clip-path: circle()` 跟随 mousemove
4. 3D 微倾斜：hover crack-zone 时 perspective 倾斜
