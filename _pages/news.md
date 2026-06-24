---
layout: default
title: "News"
permalink: /news/
---

## 最新动态

<ul class="news-list">
{% assign sorted_news = site.news | sort: 'date' | reverse %}
{% for item in sorted_news limit: 10 %}
  <li class="news-item">
    <span class="news-date">{{ item.date | date: "%Y-%m-%d" }}</span>
    <span>{{ item.title | markdownify | remove: '<p>' | remove: '</p>' }}</span>
  </li>
{% endfor %}
</ul>

{% if sorted_news.size == 0 %}
<p><em>动态即将更新。</em></p>
{% endif %}
