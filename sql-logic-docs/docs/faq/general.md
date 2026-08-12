---
sidebar_position: 1
title: 高频问题
description: 使用中最常被问到的问题
---

# 高频问题

## 产品与定位

### 文档站和 Swagger 是一回事吗？

不是。本站是**产品使用手册**（怎么用），由 Docusaurus 构建；Swagger 是后端自动生成的**接口契约**（怎么调）。两者分开，详见 [API 概览](/docs/api/overview)。

### 主客户端和控制台是什么关系？

两个独立的应用：

- **主客户端**（端口 3000）—— 与多 Agent 系统对话、浏览 Schema、配置 Agent。
- **控制台**（端口 3001）—— 回看执行记录、监控 LLM 调用、用户管理。

它们共享同一个后端，但互不依赖，可分别启动。

### 我需要会写 SQL 吗？

不需要。你只需用大白话描述想要什么，Data Scientist Agent 会生成并执行 SQL。当然，如果你懂 SQL，可以把提问写得更精准，效果更好。

### 这和传统的 BI 工具有什么区别？

传统 BI 工具需要你预先建模型、配仪表盘；Must Be The SQL 是**对话式**的——你直接问，Agent 实时生成 SQL、执行、分析、出报告，且每个 Agent 的思考过程透明可见。

## 多 Agent 系统

### 为什么有时候只有一个 Agent 在回答？

Manager Agent 会先评估问题复杂度。简单问题（如「这张表有多少行」）直接由 Dashboard Assistant 回答，不需要调度 Planner 和其他 Worker Agent——这样更快更省 token。

### 思考过程是真实的 LLM 推理吗？

是的。当 LLM 支持原生思考模式时（如豆包 `thinking: {type: "enabled"}`、DeepSeek `reasoning_effort`），单次 API 调用同时返回 `reasoning_content`（推理链路）和 `content`（最终输出）。推理内容通过 SSE 分块流式推送至前端，无需额外 LLM 调用。

### 为什么 Manager Agent 没有思考过程？

Manager Agent 的决策逻辑是编排调度，不对外展示（`shouldEmitThinking() = false`），避免编排噪声。只有专业 Worker Agent（Planner、Data Scientist、Code Assistant 等）的推理过程才会流式展示。

### SQL 执行失败怎么办？

Data Scientist Agent 会自动修复 SQL 并重试，最多 2 次。如果仍然失败，错误信息会展示在结果卡片中，你可以调整提问后重新执行。

### 代码在沙箱里执行安全吗？

安全。Python/Shell 代码在 Docker 隔离沙箱中运行，执行前会经过 AST 校验和黑名单检测。生产环境默认 fail-closed——未配置 Docker 时拒绝执行而非回退到宿主。

## 上下文压缩

### 上下文压缩是什么？

长对话会逐渐逼近 LLM 的 token 预算。系统采用四层渐进式压缩策略（L1–L4）在不丢失关键上下文的前提下保持对话连续性。详见 [核心概念 - 上下文压缩](/docs/constructure/concepts#上下文压缩)。

### 压缩会丢失我的对话内容吗？

L1/L2 是轻量操作（截断旧工具输出、丢弃旧轮次），L3 会用 LLM 生成结构化摘要替换旧轮次——保留语义但不再是原文。最近的 3 轮对话始终保留，不会被压缩。

### 圆形进度环显示红色怎么办？

表示 token 使用率已超过 80%。你可以：
- 点击进度环手动触发压缩
- 直接继续提问，系统会在必要时自动压缩
- 开始新对话（如果当前话题已完成）

### 手动压缩显示失败？

如果手动压缩返回失败，可能是：
- LLM 服务暂时不可用（L3 需要 LLM 调用）
- 当前上下文已是最小状态（无可压缩空间）
- 后端 `compact-context` 端点异常——查看后端日志

## 监控与运维

### 控制台里 Agent 数据为什么是空的？

LLM Monitor 的数据来自多 Agent 对话。如果你只跑了工作流模式（非对话模式），这里可能为空，属正常现象。

### 状态徽标颜色代表什么？

- 🟢 绿色 = 成功
- 🔴 红色 = 失败
- 🟡 黄色 = 运行中或状态未知

### 如何查看某次对话的 token 消耗？

在控制台 LLM Monitor 中找到对应的对话记录，点进去可以看到每个 Agent 的 LLM 调用次数和令牌消耗。

## 下一步

- 部署与运行报错 → [排错指引](/docs/faq/troubleshooting)
