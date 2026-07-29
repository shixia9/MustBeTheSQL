---
sidebar_position: 2
title: 嵌入 OpenAPI 文档
description: 把 Swagger / OpenAPI 嵌入或跳转到文档站
---

# 嵌入 OpenAPI 文档

有三种方式把后端 OpenAPI 文档与本站结合，按侵入性从低到高排列。

## 方式一：跳转链接（推荐）

零维护，后端 Swagger 更新即生效：

```markdown
完整接口契约见 [Swagger UI](https://api.example.com/swagger-ui.html)。
```

## 方式二：iframe 嵌入页面

在 Docusaurus 里用 MDX 嵌入一个 iframe 页面。新建 `docs/api/swagger-embed.mdx`：

```mdx
---
title: 在线接口调试
description: 嵌入后端 Swagger UI
---

import BrowserOnly from '@docusaurus/BrowserOnly';

# 在线接口调试

<BrowserOnly>
  {() => (
    <iframe
      src="https://api.example.com/swagger-ui.html"
      style={{ width: '100%', height: '80vh', border: '1px solid var(--ifm-toc-border-color)', borderRadius: 10 }}
      title="Swagger UI"
    />
  )}
</BrowserOnly>
```

:::tip 为什么用 BrowserOnly
iframe 在 SSR 阶段无法访问浏览器环境，用 `BrowserOnly` 包裹避免构建期报错。
:::

## 方式三：Docusaurus OpenAPI 插件

如果想把 OpenAPI 规范「原生」渲染为 Docusaurus 页面，使用社区插件 [`docusaurus-plugin-openapi-docs`](https://github.com/PaloAltoNetworks/docusaurus-plugin-openapi-docs)：

```bash
npm install --save docusaurus-plugin-openapi-docs
```

把后端导出的 `openapi.json` 放进仓库，插件会按 tag 生成文档页。**注意**：这种方式需要每次后端变更后重新导出规范并提交，维护成本高于方式一。

## 生产建议

- **首选方式一**：零维护、永远最新。
- 需要离线 / 版本快照时，再用方式三把 `openapi.json` 固化进仓库。
- 不要把后端字段细节复制进产品教程，避免双向维护漂移。
