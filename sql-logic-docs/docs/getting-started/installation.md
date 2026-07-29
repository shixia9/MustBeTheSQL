---
sidebar_position: 2
title: 环境与安装
description: 本地开发环境要求与依赖安装
---

# 环境与安装

## 前置要求

| 工具 | 版本 | 用途 |
| --- | --- | --- |
| Node.js | `>= 18`（推荐 20 LTS） | 前端构建 / 文档站点 |
| Java JDK | `>= 17` | Spring Boot 后端 |
| Maven | `>= 3.8` | 后端依赖与构建 |
| 数据库 | MySQL / PostgreSQL | 被编排的数据源 |

:::tip Node 版本
使用 [fnm](https://github.com/Schniz/fnm) 或 [nvm](https://github.com/nvm-sh/nvm) 锁定 Node 版本，避免多项目间切换造成的版本漂移：
```bash
fnm use 20
node -v   # v20.x
```
:::

## 克隆仓库

```bash
git clone https://github.com/must-be-the-sql/SQL-Logic-Engine.git
cd SQL-Logic-Engine
```

仓库根目录包含两个顶层工程：

```
SQL-Logic-Engine/
├── MustBeTheSQL/          # 前端（client + admin）
└── MustBeTheSQL-Server/   # 后端（Spring Boot）
```

## 安装前端依赖

```bash
# 主客户端
cd MustBeTheSQL/sql-logic-client
npm install

# Admin 控制台（独立 Vite 应用，端口 3001）
cd ../sql-logic-admin
npm install
```

## 安装后端依赖

```bash
cd ../../MustBeTheSQL-Server
mvn clean install -DskipTests
```

## 文档站点依赖

文档站点是独立工程，位于 `MustBeTheSQL/sql-logic-docs/`：

```bash
cd ../sql-logic-docs
npm install
```

:::info 文档站点 ≠ 业务前端
`sql-logic-docs/` 是一个独立的 Docusaurus 工程，**不嵌入** `sql-logic-client` 的业务代码。它有自己的 `package.json` 与 `tsconfig.json`。开发时通过 client 的 Vite proxy 用 `localhost:3000/docs` 访问，生产通过 Nginx 同域名子路径 `example.com/docs/` 访问。
:::

## 验证安装

```bash
# 后端编译
cd MustBeTheSQL-Server && mvn compile        # 期待 BUILD SUCCESS

# 前端类型检查 + 构建
cd ../MustBeTheSQL/sql-logic-client && npm run build

# 文档站点构建
cd ../sql-logic-docs && npm run build
```

三处构建全部通过即环境就绪。接下来前往 [快速开始](/docs/getting-started/quickstart) 启动你的第一个工作流。
