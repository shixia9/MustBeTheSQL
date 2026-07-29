---
sidebar_position: 2
title: 排错指引
description: 部署与运行常见问题排查
---

# 排错指引

## 文档站点访问 404 / 静态资源 404

这是 `baseUrl` 配置不一致导致的经典陷阱。

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 首页 404 | Nginx 路径与 `baseUrl` 不匹配 | `baseUrl='/docs/'` 时，Nginx `location /docs/` 指向 `build/` |
| JS/CSS 404 | 资源路径前缀缺失 | 确认 `build/` 产物以 `/docs/` 为根，不要剥离前缀 |
| 图片 404 | 用了绝对路径 `/img/x.png` | 改为相对引用 `img/x.png`，由 Docusaurus 加 `baseUrl` 前缀 |

:::danger baseUrl 陷阱
`baseUrl` 是**构建期**常量，改了必须重新 `npm run build`。运行时改 Nginx 无效。
:::

## 子域名部署时 `/docs/docs/` 双前缀

如果用「子域名模式」（`docs.example.com`）部署，必须把 `docusaurus.config.ts` 的 `baseUrl` 从 `/docs/` 改为 `/` 再重新构建，否则会出现 `docs.example.com/docs/docs/...` 双前缀。详见部署 README。

## DatabaseResource 看不到表清单

1. 确认节点已选择连接。
2. 确认后端 `DatabaseMetaDataService` 能连通该数据源。
3. 检查后端日志是否有 `DatabaseMetaData` 查询异常。
4. 账号是否有目标 Schema 的查询权限。

## Admin 控制台 Agents 数据为空

- `agent_execution_step` 由多 Agent（`domain/agentic`）路径写入；若只用单 Agent，该表为空属正常。
- 确认 `LlmCallReporter` 已正确注入。

## 构建报错：`Cannot find module '@docusaurus/...'`

依赖未安装或版本漂移：

```bash
cd MustBeTheSQL/sql-logic-docs
rm -rf node_modules build .docusaurus
npm install
```

## Mermaid 图不渲染

确认 `docusaurus.config.ts` 同时启用了 `themes: ['@docusaurus/theme-mermaid']` 与 `markdown: { mermaid: true }`，缺一不可。

## 本地搜索框不出现

`@easyops-cn/docusaurus-search-local` 需要先 `npm run build` 生成索引；`docusaurus start` 开发模式下首次加载可能稍慢。确认 `plugins` 数组里配置正确，且 `docsRouteBasePath` 与 docs 插件的 `routeBasePath` 一致。
