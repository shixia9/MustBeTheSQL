---
sidebar_position: 1
title: 整体架构
description: Must Be The SQL 由哪些部分组成、它们如何协作
---

# 整体架构

Must Be The SQL 是一个前后端分离的产品，外加一个独立的文档站点。作为使用者，你只需要记住「三个前端入口 + 一个后端」。

## 系统全景

```mermaid
flowchart LR
  subgraph 用户访问的入口
    Client["主客户端<br/>工作流画布"]
    Admin["控制台<br/>运维监控"]
    Docs["文档站点<br/>产品手册"]
  end
  subgraph 后端服务
    API["API 服务"]
    Meta["数据源元数据"]
    Exec["工作流引擎"]
    Metrics["指标记录"]
  end
  DB[("你的数据库")]

  Client --> API
  Admin --> API
  Docs -.跳转/嵌入.-> API
  API --> Meta --> DB
  API --> Exec --> DB
  Exec --> Metrics
  Metrics --> Admin

  style Client fill:#eef,stroke:#5b7fd9
  style Admin fill:#eef,stroke:#5b7fd9
  style Docs fill:#eef,stroke:#5b7fd9
```

## 三个入口

| 入口 | 你在这里做什么 |
| --- | --- |
| **主客户端** | 设计工作流、运行工作流、查看结果 |
| **控制台** | 回看执行记录、监控 Agent 与 LLM 调用 |
| **文档站点** | 阅读产品手册（就是你现在看的地方） |

## 一次请求在系统里怎么流转

当你点击「运行」时，背后发生的事：

```mermaid
sequenceDiagram
  participant U as 你
  participant C as 主客户端
  participant A as 后端 API
  participant E as 工作流引擎
  participant D as 数据库
  U->>C: 点击「运行」
  C->>A: 提交工作流
  A->>E: 交给引擎按拓扑序执行
  loop 每个节点
    E->>D: 取数 / 执行 SQL（按需）
    D-->>E: 返回数据
    E-->>A: 节点结果
    A-->>C: 推送到时间线
  end
  C-->>U: 可读的 Markdown 结果
```

你看到的「执行时间线」，就是后端把每个节点的结果实时推回前端的结果。

## 数据从哪来

工作流用到的数据不凭空产生。每个数据节点都会连接到你预先配置好的数据源：

```mermaid
flowchart LR
  Cfg["连接管理<br/>配置数据库连接"] --> Meta["后端拉取<br/>Schema 与表清单"]
  Meta --> Node["DatabaseResource 节点<br/>级联选择 连接→Schema→表"]
  Node --> Engine["进入工作流执行"]
  style Cfg fill:#eef,stroke:#5b7fd9
```

这就是为什么你在节点里看到的是「下拉选择」而不是「手填连接串」——表清单是引擎实时从数据库取的，既准确又不易出错。

## 进一步理解

- 想知道节点、工作流、Agent 到底是什么关系？→ [核心概念](/docs/constructure/concepts)
- 想亲手搭一个工作流？→ [工作流设计](/docs/guide/workflow-design)
