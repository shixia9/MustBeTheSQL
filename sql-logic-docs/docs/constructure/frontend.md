---
sidebar_position: 2
title: 前端结构
description: React SPA 前端模块组织与设计系统
---

# 前端结构

## 设计系统

统一主题变量定义在 `src/index.css`，`:root` 为浅色、`.dark` 为深色：

```css
:root {
  --color-primary: #5b7fd9;
  --color-primary-glow: rgba(91, 127, 217, 0.35);
  --color-primary-hover: #6b8fe6;
  --app-bg: #fafbfc;
  --card-bg: #ffffff;
  --ink: #10131f;
}
.dark {
  --app-bg: #0d0f14;
  --card-bg: #161821;
  --ink: #e4e6ee;
}
```

字体栈：`Inter`（正文）+ `JetBrains Mono`（代码），从 Google Fonts 引入。

## sql-logic-client（主客户端）

工作流画布是核心交互，关键文件：

- **`NodeConfigPanel.tsx`**：节点配置面板。DataScience / DatabaseResource 节点使用「连接 → Schema → Table」级联下拉，而非纯文本输入连接 ID。
- **`ExecutionTimelineModal.tsx`**：执行时间线。
  - 卡片用 `motion.div` 入场动画（`opacity 0→1`、`y 10→0`、280ms ease-out）。
  - React key 使用稳定的 `entry.nodeId`，状态切换时避免重复节点。
  - `formatOutput` 用 `react-markdown` + `remark-gfm` 渲染结果，原始 JSON 兜底为 `<pre>`。

## sql-logic-admin（控制台）

独立 Vite 应用，端口 3001。注意 `tsconfig.json` 不开启 `noUnusedLocals`，但仍需保持 imports 干净。

- **`Dashboard.tsx`**：使用 CSS 变量 + 工具类（`.card`、`.stat-card`、`.th`、`.td`、`.badge-ok`/`.badge-err`/`.badge-warn`、`.btn-primary`/`.btn-ghost`）。
- 信号色变量：`--color-sig-green` / `--color-sig-red` / `--color-sig-amber`（含 `-soft` 变体）用于状态徽标与图表条。
- 侧边栏含 **Workflows** 标签（分页的 `agent_execution` 记录）与 **LLM Monitor → Agents** 子标签（`agent_execution_step` 指标，非分页）。

## 信号色

| 语义 | 变量 | 用途 |
| --- | --- | --- |
| 成功 | `--color-sig-green` / `-soft` | `badge-ok` |
| 失败 | `--color-sig-red` / `-soft` | `badge-err` |
| 运行中 / 未知 | `--color-sig-amber` / `-soft` | `badge-warn` |
