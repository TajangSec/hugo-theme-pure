---
title: '{{ replace .File.ContentBaseName "-" " " | title }}'
slug: '{{ substr (md5 (printf "%s|%d" (replace .Name "-" "") now.Unix)) 0 6 | lower }}'
description: ''
date: {{ .Date }}
lastmod: {{ .Date }}
tags: []
categories: []
language: '中文'
# heroImage: '/images/cover.png'   # 设置封面，heroImageColor 会从这里取出现最多的颜色
# heroImageColor: '#9ab8d4'        # 指定文章主题色，优先级低于单篇指定：highlightColor ，高于全站的 autoFromHeroImage = true
# pin: true
# toc: false
# comment: true
---

<!-- Write your post here -->
