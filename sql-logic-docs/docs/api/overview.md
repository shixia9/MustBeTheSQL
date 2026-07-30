---
sidebar_position: 1
title: API 概览
description: 接口概览与 Swagger / OpenAPI 文档的关系
---

# API 概览

本页是产品手册视角的接口说明，帮你快速了解「有哪些接口、怎么对接」。如果你需要精确到字段级别的契约，请直接使用后端自动生成的 Swagger 文档。

## 两份文档，各司其职

```mermaid
flowchart LR
  subgraph 本站（产品手册）
    A1["怎么用：场景、流程、示例"]
  end
  subgraph Swagger（接口契约）
    A2["怎么调：路径、参数、返回值"]
  end
  A1 -.跳转/嵌入.-> A2
  style A1 fill:#eef,stroke:#5b7fd9
  style A2 fill:#efe,stroke:#3b8c5e
```

| 文档 | 维护方式 | 回答的问题 |
| --- | --- | --- |
| **本站（API 说明）** | 人工撰写 | 这个接口是干嘛的、什么场景用 |
| **Swagger UI** | 后端代码自动生成 | 字段叫什么、类型是什么、必填吗 |

:::note 为什么要分开
产品手册讲「场景与用法」，更新节奏慢；接口契约讲「字段与类型」，跟随后端每次构建自动更新。混在一起会出现「手册里写的字段早就改名了」的尴尬，分开维护更健康。
:::

## 主要接口分类

| 接口分类 | 说明 | 典型场景 |
| --- | --- | --- |
| 工作流管理 | 创建、运行、查询工作流 | 主客户端提交工作流 |
| 数据源管理 | 配置与测试连接、拉取表清单 | 连接管理、节点选表 |
| Admin 数据 | 工作流记录、Agent 指标 | 控制台展示 |

:::info 想看完整接口列表
完整、可交互的接口清单请见 [Swagger UI](http://localhost:8080/swagger-ui.html)（本地），生产环境替换为对外域名。
:::

## 如何跳转到 Swagger

后端启动后，Swagger UI 默认在：

```
http://localhost:8080/swagger-ui.html
```

在文档里直接放链接即可跳转：

```markdown
完整接口契约见 [Swagger UI](http://localhost:8080/swagger-ui.html)。
```

## 把 Swagger 嵌进文档站

如果你希望用户「不离开文档站」就能调试接口，可以把 Swagger UI 用 iframe 嵌入一个文档页。具体做法见 [嵌入 OpenAPI 文档](/docs/api/openapi-bridge)。

## 下一步

- 嵌入 Swagger 的三种方式 → [嵌入 OpenAPI 文档](/docs/api/openapi-bridge)
- 遇到接口问题 → [排错指引](/docs/faq/troubleshooting)
