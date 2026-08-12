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

### Multi-Agent 对话

| 接口 | 方法 | 用途 |
|------|------|------|
| `/api/v1/agentic/chat/stream` | POST | 启动多 Agent 对话（SSE 流式） |
| `/api/v1/agentic/continue` | POST | 恢复暂停的 HITL 会话（SSE） |
| `/api/v1/agentic/context-budget` | GET | 查询当前 token 预算使用情况 |
| `/api/v1/agentic/compact-context` | POST | 手动触发上下文压缩 |

### 沙箱执行

| 接口 | 方法 | 用途 |
|------|------|------|
| `/api/v1/sandbox/run` | POST | 在沙箱中执行 Python/Shell 代码 |

### SQL 与数据库

| 接口 | 方法 | 用途 |
|------|------|------|
| `/api/v1/sql/execute` | POST | 在连接的数据库上执行 SQL |
| `/api/v1/sql/console/execute` | POST | SQL 控制台执行 |
| `/api/v1/database/**` | 各种 | 数据库连接 CRUD + 元数据 |
| `/api/v1/schema/**` | 各种 | Schema 浏览（表/列/索引/DDL） |

### 工作区

| 接口 | 方法 | 用途 |
|------|------|------|
| `/api/v1/workspaces` | GET / POST | 列表 / 创建工作区 |
| `/api/v1/workspaces/{id}/members` | GET / POST | 成员管理 |

### Agent Studio

| 接口 | 方法 | 用途 |
|------|------|------|
| `/api/v1/agent-entity` | CRUD | Agent 配置管理 |
| `/api/v1/agent-entity/{id}/publish` | POST | 发布版本快照 |
| `/api/v1/agent-entity/{id}/versions/{vid}/revert` | POST | 回滚到指定版本 |

### LLM 与记忆

| 接口 | 方法 | 用途 |
|------|------|------|
| `/api/v1/llm-config` | CRUD | LLM 提供商配置 |
| `/api/v1/llm-config/{id}/test` | POST | 测试 LLM 连通性 |
| `/api/v1/llm-config/{id}/strategy` | PUT | HA 策略 + 降级链 |
| `/api/v1/memory/**` | 各种 | 记忆 CRUD + 抽取 |

### MCP 工具

| 接口 | 方法 | 用途 |
|------|------|------|
| `/api/v1/mcp-servers` | GET / POST | 列表 / 添加 MCP 服务器 |
| `/api/v1/mcp-servers/{id}/connect` | POST | 重连 |
| `/api/v1/tools` | GET | 列出已注册工具 |

## SSE 事件类型

多 Agent 对话接口（`/api/v1/agentic/chat/stream`）通过 SSE 推送以下事件：

| 事件 | 说明 |
|------|------|
| `STARTED` | Agent 节点开始执行 |
| `THINKING` | 流式推理分块（含 `done` 标志） |
| `FINISHED` | Agent 节点执行完成，携带输出 |
| `SANDBOX` | 沙箱代码执行输出（流式） |
| `PLAN_UPDATED` | 执行计划快照更新 |
| `CONTEXT_COMPACT` | 上下文压缩触发（L1–L4） |
| `COMPLETED` | 完整 Agent 运行结束 |

## 响应格式

所有 API 响应统一包裹在标准信封中：

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

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
