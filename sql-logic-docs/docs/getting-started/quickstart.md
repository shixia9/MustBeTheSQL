---
sidebar_position: 3
title: 快速开始
description: 十分钟跑通一个最小工作流
---

# 快速开始

本节带你启动整套服务并跑通一个最小工作流：连接数据库 → 执行 SQL → 查看可读结果。

## 1. 启动后端

```bash
cd MustBeTheSQL-Server
mvn spring-boot:run
# 默认端口 8080，Swagger 文档: http://localhost:8080/swagger-ui.html
```

## 2. 启动前端

主客户端与 Admin 控制台分别在两个终端启动：

```bash
# 终端 A — 主客户端（端口 3000）
cd MustBeTheSQL/sql-logic-client
npm run dev

# 终端 B — Admin 控制台（端口 3001）
cd MustBeTheSQL/sql-logic-admin
npm run dev
```

| 服务 | 地址 |
| --- | --- |
| 主客户端 | http://localhost:3000 |
| Admin 控制台 | http://localhost:3001 |
| 后端 API | http://localhost:8080 |
| Swagger | http://localhost:8080/swagger-ui.html |
| 文档站点（开发） | http://localhost:3005/docs/ |

## 3. 创建数据源连接

1. 打开主客户端，进入 **连接管理**。
2. 新建一个连接，填入数据库类型、Host、Port、用户名、密码。
3. 点击 **测试连接**，通过后保存。

## 4. 设计工作流

1. 进入 **工作流画布**。
2. 拖入一个 **DatabaseResource** 节点，选择刚创建的连接，级联选择 Schema 与 Table——表清单是实时从 `DatabaseMetaDataService` 拉取的。
3. 拖入一个 **Agent** 节点，将 DatabaseResource 的输出连接到 Agent 的输入。
4. 在 Agent 节点配置自然语言意图，例如「统计该表每天的行数」。

## 5. 执行并查看结果

点击画布右上角 **运行**。执行时间线会逐节点弹出：

- 卡片带入场动效（`opacity 0→1`、`y 10→0`、280ms ease-out）。
- 使用稳定的 `nodeId` 作为 React key，状态切换时不会出现重复节点。
- 结果用 Markdown（`react-markdown` + `remark-gfm`）渲染，原始 JSON 兜底为 `<pre>`。

:::tip 看不到表清单？
确认 DatabaseResource 节点已选中连接，且后端 `DatabaseMetaDataService` 对该连接可达。详见 [FAQ - 排错](/docs/faq/troubleshooting)。
:::

## 6. 在 Admin 控制台查看指标

打开 [http://localhost:3001](http://localhost:3001) 控制台：

- **Dashboard**：工作流概览与状态徽标（`badge-ok` / `badge-err` / `badge-warn`）。
- **Workflows**：分页的 `agent_execution` 记录，支持搜索。
- **LLM Monitor → Agents**：每个 Agent 的步骤级指标（`agent_execution_step`，非分页）。

---

🎉 恭喜，你已经跑通了 Must Be The SQL 的核心闭环。接下来阅读 [项目结构](/docs/constructure/overview) 深入了解架构。
