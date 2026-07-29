---
sidebar_position: 1
title: 高频问题
description: 常见疑问汇总
---

# 高频问题

## 文档站点和 Swagger 是一回事吗？

不是。本站（`sql-logic-docs`）是产品使用教程，用 Docusaurus 手写维护；Swagger 是后端 Springdoc 自动生成的接口契约。两者分开，详见 [API 概览](/docs/api/overview)。

## 主客户端和 Admin 控制台是什么关系？

两个独立的前端工程：

- `sql-logic-client`（端口 3000）：工作流画布、连接管理。
- `sql-logic-admin`（端口 3001）：运维监控 Dashboard。

它们共享后端 API，但构建配置、依赖、tsconfig 完全独立。

## 为什么 `llm_call_metrics` 数据层会被多 Agent 改动吗？

不会。`llm_call_metrics` 表结构稳定，被单 Agent（`domain/agent`）和多 Agent（`domain/agentic`）通过共享的 `LlmCallReporter` 共同使用。多 Agent 监控是增量视图，不是数据源迁移。

## DatabaseResource 节点为什么不是填连接 ID？

为了准确性与易用性。DataScience / DatabaseResource 节点用「连接 → Schema → Table」级联下拉，表清单由后端 `DatabaseMetaDataService` 实时拉取，避免手填 ID 出错。

## Admin 的 tsconfig 为什么没开 noUnusedLocals？

`sql-logic-admin` 是独立 Vite 应用，`tsconfig.json` 不开启 `noUnusedLocals`，但团队约定仍需保持 imports 干净。主客户端 `tsconfig` 的严格度由自身配置决定。

## 时间线出现重复节点怎么办？

不会出现。执行时间线的 React key 使用稳定的 `entry.nodeId`，状态切换时不会产生重复节点。如果遇到，请确认升级到包含该修复的版本。

## 文档站点要改主题色怎么办？

主题色集中在 `src/css/custom.css` 顶部的 `--ifm-color-primary-*` 变量，改一处即全局生效（同时同步 `custom.css` 里的硬编码 `#5b7fd9` 渐变与 `rgba(91,127,217,...)` 软色）。
