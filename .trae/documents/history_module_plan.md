# History (历史记录) 模块完善计划

## 1. 模块审查总结 (Review & Current State)
在作为审查员对当前 `HistoryPage.tsx` 及后端 `QueryHistory` 相关代码进行审计后，发现以下尚未完成的功能与潜在的性能隐患：

1. **分页机制缺失（严重性能隐患）**：当前后端接口 `/api/v1/history/user/{userId}` 为全量拉取数据。随着用户查询量增加，这会导致后端 OOM 以及前端 DOM 渲染卡顿。前端的 UI 分页控件目前仅为静态占位。
2. **过滤与搜索失效**：前端页面顶部的关键字搜索、数据库类型（DB Type）、大模型（Model）以及时间范围（Date Range）筛选控件均未与后端接口打通。
3. **数据操作缺失**：列表行的“删除 (Trash2)”和“复制 (Copy)”按钮点击无响应，后端亦缺少对应的删除接口。
4. **重新执行与编辑闭环未打通**：点击“重新执行 (Re-run/Play)”时，未能将数据状态传递回 Dashboard；且详情面板中的“时间线 (Process History)”为静态数据，未能体现真实的执行流水。

## 2. 架构设计与核心决策 (Architecture & Decisions)

根据需求沟通，确立以下架构设计策略：

* **服务端分页 (Server-Side Pagination)**：为解决全量数据拉取的性能问题，必须在后端引入 Mybatis-Plus 的 `PaginationInnerInterceptor` 进行物理分页拦截。前端通过传递 `page` 和 `size` 参数按需加载数据，保障系统高可用。
* **审计追踪与时间线持久化 (Lineage Tracking)**：满足“对每个记录的Re-Run和修改都需要有流水记录”的需求，决定在 `query_history` 表中新增 `parent_id` (父记录 ID) 字段。
  * 当用户在历史记录点击 Re-run 跳转至工作台并修改执行后，新生成的记录将通过 `parent_id` 关联到原始记录。
  * 详情页的时间线将根据 `parent_id` 追溯查询，渲染真实的生命周期流转（如：生成 -> 执行 -> 被重新编辑执行）。
* **全量过滤下推 (Filter Push-down)**：关键字、DB类型、模型、时间范围等所有过滤条件均下推至数据库执行层，前端配合 `Debounce` (防抖) 减少无效请求。

## 3. 实施步骤 (Proposed Changes)

### Step 1: 数据库与实体层改造
* **修改表结构**：在 `query_history` 表中新增 `parent_id BIGINT` 字段（`init.sql` 同步更新）。
* **更新实体类**：`QueryHistory.java` 新增 `parentId` 属性映射。

### Step 2: 后端配置与接口开发
* **引入分页插件**：新增 `MybatisPlusConfig.java` 注册 `PaginationInnerInterceptor`。
* **重构查询接口**：修改 `QueryHistoryController.java` 和 `QueryHistoryAppService.java`，将 `getUserHistory` 接口升级为支持多条件动态查询：
  * 入参：`userId`, `page`, `size`, `keyword`, `dbType`, `model`, `startDate`, `endDate`。
  * 返回：包装为分页对象返回（包含 `records` 和 `total`）。
* **新增删除接口**：实现 `DELETE /api/v1/history/{id}`。
* **记录追溯接口**：新增根据 ID 查询其家族关联记录的接口，用于前端时间线渲染。
* **更新记录生成逻辑**：在保存新的 SQL 记录时，允许接收 `parentId` 以建立派生关系。

### Step 3: 前端页面功能实现 (`HistoryPage.tsx`)
* **状态绑定与防抖**：将顶部的 Search、Select 和 DateRange 绑定 React State，利用 `useEffect` 和 `setTimeout` 实现防抖搜索。
* **分页组件驱动**：解析后端返回的 `total`，计算总页数，并让底部的 `ChevronLeft` / `ChevronRight` / 页码按钮具备实际的翻页请求能力。
* **快捷操作接入**：
  * 实现 **Copy** 功能，调用 `navigator.clipboard`。
  * 实现 **Delete** 功能，调用后端 DELETE 接口，成功后重新 `fetchHistory` 并清空右侧详情面板。

### Step 4: Re-run (重新执行) 联动流转闭环
* **发起跳转**：在 `HistoryPage.tsx` 点击 Play 或 Re-run 时，触发全局事件 `window.dispatchEvent` 或设置 `localStorage` 缓存，携带 `{ prompt, sql, connectionId, parentHistoryId }` 并通过路由跳转至 Dashboard。
* **接收与执行**：修改 `DashboardPage.tsx`，监听上述跳转事件并回填到对应的输入框和代码编辑器中。
* **时间线渲染**：在 `HistoryPage.tsx` 右侧面板中，调用后端的时间线接口，将静态的 "Process History" 替换为真实动态的记录链条。

## 4. 验证标准 (Verification)
1. F12 Network 面板确认分页请求是否携带 `page` 参数，且只返回单页数据量（如 10 条）。
2. 在任意过滤控件输入/选择条件，列表需动态刷新且结果准确。
3. 删除某条记录后，列表项消失且数据库对应数据被清理。
4. 从历史记录点击 Re-run 跳转至主页修改 SQL 后执行，回到历史记录页面查看新记录的 Timeline 能够看到其与老记录的继承关系。