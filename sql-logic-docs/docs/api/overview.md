---
sidebar_position: 1
title: API 概览
description: REST 接口概览与 Swagger / OpenAPI 关系
---

# API 概览

本页是**产品教程侧的接口说明**。完整的、可交互的接口文档由后端 Springdoc 自动生成，独立运行，两者分工如下：

| 文档 | 形态 | 维护方 | 更新方式 |
| --- | --- | --- | --- |
| 本页（API 说明） | Docusaurus 教程 | 文档作者手写 | 跟随产品迭代 |
| Swagger UI | 后端自动生成 | Springdoc 注解 | 后端构建时自动产出 |

## 核心 REST 端点

| 端点 | 方法 | 说明 |
| --- | --- | --- |
| `/api/v1/admin/workflows` | GET | 分页工作流记录（含搜索） |
| `/api/v1/admin/llm/metrics/agents` | GET | per-agent 指标扁平列表（非分页） |
| `/api/v1/admin/...` | GET | Admin 控制台其余数据源 |

:::info 文档 ≠ 接口文档
产品使用教程（本站）讲解「怎么用」；Swagger 讲解「接口字段与契约」。两者分开，避免在产品文档里维护易过期的字段细节。
:::

## 如何跳转到 Swagger

后端运行后，Swagger UI 默认在：

```
http://localhost:8080/swagger-ui.html
```

在文档内直接放置跳转链接即可：

```markdown
完整接口契约见 [Swagger UI](http://localhost:8080/swagger-ui.html)。
```

生产环境把域名替换为对外地址，例如 `https://api.example.com/swagger-ui.html`。

下一步：[嵌入 OpenAPI 文档](/docs/api/openapi-bridge) 介绍如何把 Swagger 直接嵌进本站。
