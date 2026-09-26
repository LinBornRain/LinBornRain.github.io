# 架构逻辑图（Archify 产物）

本页「架构逻辑」区那张工作链路图，**直接内联自已有的 Archify 产物**，不是另画的：

- 源目录：`New project/archify/4d-gen-reconstruction/`
- 图规格：[`4d-gen-workchain.architecture.json`](4d-gen-workchain.architecture.json)（此处为副本，与源目录一致）
- 交互式版本：`../../New project/archify/4d-gen-reconstruction/4d-gen-workchain.html`（引导视图／缩放／主题／导出）
- 该产物原始验收：`validate --quality showcase` 9/9 通过、`check` 通过、四视口 visual-check 通过（见源目录的 `README.md` 与 `4d-gen-evidence.md`）

重新渲染（需 v2.16+ 的 Archify，本机在 `~/.hermes/skills/diagramming/archify`；
`~/.claude/skills/archify` 为 v2.11，schema 不接受 `visual_preset` / `views`）：

```bash
A=~/.hermes/skills/diagramming/archify/bin/archify.mjs
$A validate architecture 4d-gen-workchain.architecture.json --quality showcase --json
$A render   architecture 4d-gen-workchain.architecture.json /tmp/workchain.html
```

内联方式：取渲染结果里的 `<svg>…</svg>`，去掉查看器交互钩子（`tabindex`、`role="button"`）后放进 `index.html` 的
`<figure class="diagram arch">`；配色在 `index.html` 的 `.arch{…}` 作用域内绑到本站主题——
语义色沿用该产物的 signal-flow 预设，中性色（底/字/网格/箭头/遮罩）跟随页面变量，因此明暗切换同步。
