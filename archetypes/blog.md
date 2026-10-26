---
title: '{{ replace .File.ContentBaseName "-" " " | title }}'
# 6 位短 slug（与 HackYourHeart 同一套生成方式）
slug: '{{ substr (md5 (printf "%s|%d" (replace .Name "-" "") now.Unix)) 0 6 | lower }}'
description: ''
date: {{ .Date }}
lastmod: {{ .Date }}
tags: []
categories: []
language: '中文'
# heroImage: '/images/cover.png'   # static path, or a page-bundle resource name
# heroImageColor: '#9ab8d4'        # tints the post's highlight colour
# pin: true
# toc: false
# comment: true
---

<!-- Write your post here -->
