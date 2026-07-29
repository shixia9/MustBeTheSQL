---
sidebar_position: 3
title: Admin 控制台
description: 工作流概览与 LLM 监控
---

# Admin 控制台

`sql-logic-admin` 是独立的 Vite 应用，运行在端口 **3001**，提供运维监控视图。

## 视图总览

| 视图 | 数据来源 | 是否分页 |
| --- | --- | --- |
| Dashboard | `AdminDataDTOs` 聚合 | 否 |
| Workflows | `agent_execution` | 是（含搜索） |
| LLM Monitor → Agents | `agent_execution_step` | 否（搜索 / 分页隐藏） |

## Dashboard

`Dashboard.tsx` 使用 CSS 变量 + 工具类构建，样式定义在 `src/index.css`：

- 卡片：`.card`、`.stat-card`
- 表格：`.th`、`.td`
- 状态徽标：`.badge-ok` / `.badge-err` / `.badge-warn`
- 按钮：`.btn-primary` / `.btn-ghost`

### 状态徽标配色

| 状态 | 徽标类 | 信号色变量 |
| --- | --- | --- |
| 成功 | `.badge-ok` | `--color-sig-green` |
| 失败 | `.badge-err` | `--color-sig-red` |
| 运行中 / 未知 | `.badge-warn` | `--color-sig-amber` |

> `--color-sig-amber` 等信号色含 `-soft` 变体，分别用于实心徽标与软背景条。

## Workflows

分页展示 `agent_execution` 记录，支持搜索。`WorkflowStatusBadge` 组件对 RUNNING / 未知状态使用 `badge-warn`。

## LLM Monitor → Agents

展示 `agent_execution_step` 步骤级指标。因为是非分页视图，搜索框与分页控件被隐藏。

## 后端端点

| 端点 | 说明 | 分页 |
| --- | --- | --- |
| `GET /api/v1/admin/llm/metrics/agents` | per-agent 指标扁平列表 | 否 |
| `GET /api/v1/admin/workflows` | 工作流记录 | 是 |

:::tip 构建
Admin 控制台与主客户端、文档站点互不依赖，可独立构建：`cd MustBeTheSQL/sql-logic-admin && npm run build`。
:::
