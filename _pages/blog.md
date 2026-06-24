---
layout: default
title: "Blog"
permalink: /blog/
---

## 博客文章

<ul class="post-list">
{% for post in site.posts %}
  <li class="post-item">
    <div class="post-meta">{{ post.date | date: "%Y-%m-%d" }}</div>
    <h3><a href="{{ post.url }}">{{ post.title }}</a></h3>
    <div class="post-excerpt">{{ post.excerpt | strip_html | truncate: 150 }}</div>
  </li>
{% endfor %}
</ul>

{% if site.posts.size == 0 %}
<p><em>博客文章即将上线。</em></p>
{% endif %}
