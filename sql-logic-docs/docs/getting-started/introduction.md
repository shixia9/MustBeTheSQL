---
sidebar_position: 1
title: 产品介绍
description: Must Be The SQL 是什么、解决什么问题、核心能力一览
---

# 产品介绍

**Must Be The SQL** 是一个面向数据科学工作流的可视化 SQL 逻辑引擎。它把「连接数据库 → 编排 Agent → 执行 SQL → 输出可读结果」沉淀为一个节点式画布，让非工程背景的数据人员也能像搭积木一样构建可复用的数据逻辑。

## 它解决什么问题

| 痛点 | Must Be The SQL 的做法 |
| --- | --- |
| 手写 SQL 难以复用、难以追溯 | 工作流节点化，节点输出可被下游消费并回溯 |
| Agent 执行结果是一坨 JSON | 执行时间线用 Markdown 渲染输出，可读性强 |
| 不知道库里有哪些表 | 选表时自动拉取真实表清单与 DDL |
| LLM 调用黑盒 | `llm_call_metrics` 统一上报，Admin 控制台可视化 |

## 核心能力

- **工作流编排**：DataScience、DatabaseResource、Agent 等节点，支持连接级联、Schema/Table 探测。
- **Agent 执行**：单 Agent 与多 Agent（agentic workflow）两种模式，执行时间线带入场动效。
- **数据源接入**：`DatabaseMetaDataService` 自动拉取表清单与 DDL。
- **LLM 监控**：统一数据层，Admin 控制台提供工作流概览与 Agent 步骤指标。
- **Linear 风格 UI**：统一 `#5b7fd9` 主色调、明暗双模式、Inter 字体栈。

## 技术栈

- **前端**：React 19 + TypeScript 5.8 SPA（`sql-logic-client` 主客户端 + `sql-logic-admin` 独立控制台）
- **后端**：Java Spring Boot（`MustBeTheSQL-Server`）

> 下一步：前往 [安装](/docs/getting-started/installation) 搭建本地环境。
