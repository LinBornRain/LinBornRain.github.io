# wzljhboy.github.io

个人学术主页，基于 al-folio 框架 + 小米 MiMo 风格 Hero。

**在线预览**: https://wzljhboy.github.io

## 项目结构

```
wzljhboy_page/
├── _config.yml              ← 站点 + Hero 配置
├── _layouts/                ← 页面模板
│   ├── default.html         ← 基础模板 (导航 + 页脚)
│   └── about-hero.html      ← 带 MiMo Hero 的 about 模板
├── _includes/               ← 可复用组件
│   ├── header.html          ← 导航栏
│   ├── footer.html          ← 页脚
│   └── hero.html            ← ★ MiMo Hero (纹理 + 翻转 + 鼠标)
├── _pages/                  ← 页面内容 (Markdown)
│   ├── about.md             ← 主页 (about-hero 模板)
│   ├── publications.md      ← 论文列表
│   ├── projects.md          ← 项目卡片
│   ├── blog.md              ← 博客索引
│   ├── news.md              ← 动态列表
│   └── cv.md                ← 简历
├── _data/
│   └── navigation.yml       ← 导航菜单配置
├── _news/                   ← 新闻条目 (每条一个 .md)
├── _projects/               ← 项目条目 (每条一个 .md)
├── _posts/                  ← 博客文章
├── _bibliography/
│   └── papers.bib           ← BibTeX 引用
├── assets/
│   ├── css/
│   │   ├── main.css         ← al-folio 风格全局样式
│   │   └── hero.css         ← MiMo Hero 样式
│   └── js/
│       └── hero.js          ← Hero 交互 JS
├── images/                  ← 图片素材
├── index.html               ← 根路由
├── Gemfile                  ← Ruby 依赖
└── README.md
```

## 本地运行

```bash
cd wzljhboy_page
bundle install
bundle exec jekyll serve
# 访问 http://localhost:4000
```

## 部署到 GitHub Pages

```bash
# 1. 创建仓库
git init
git remote add origin https://github.com/wzljhboy/wzljhboy.github.io.git

# 2. 推送
git add .
git commit -m "Initial commit: al-folio + MiMo Hero"
git push -u origin main

# 3. GitHub Settings → Pages → Source: main branch → Save
```

## Hero 配置

编辑 `_config.yml` 中的 Hero 部分：

```yaml
hero_name: "林雨生"
hero_pattern: "林 雨 生"       # 正面纹理文字
hero_pattern_en: "LIN YUSHENG"  # 反面纹理文字
hero_title: "HELLO, 世界"       # 正面大标题
hero_title_alt: "你好，我是林雨生" # 反面大标题
hero_about: |
  欢迎来到我的主页...          # 翻转背面的自我介绍
```

## 灵感来源

- [al-folio](https://github.com/alshedivat/al-folio) - Jekyll 学术主题
- [MiMo](https://mimo.xiaomi.com) - 小米 MiMo 主页 Hero 设计

## 许可

MIT License
