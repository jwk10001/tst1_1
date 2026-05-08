# Diary History

本项目是一个本地优先的 Web 日记本系统。它使用 Node.js、Next.js、TypeScript、Prisma 和 SQLite 实现类似 Git 的历史记录能力。

## v0.5 功能

- 列表页支持导出整个应用的 JSON 备份。
- 列表页支持导入本地 JSON 备份，且不会覆盖现有数据。
- 导入后会重建每篇日记的完整版本链，并保留归档状态。
- 备份文件会校验版本引用和内容 hash，避免损坏历史被导入。

## v0.4 功能

- 编辑页支持点击“对比”或按 `Alt+H` 直接查看版本差异。
- 对比面板默认展示上一版本与当前已保存版本的 side-by-side diff。
- 未保存内容会明确提示先保存后再进入版本对比。
- 列表、编辑页和历史页文案更简洁。

## v0.3 功能

- 日记列表支持按标题和正文搜索。
- 日记列表支持按最近更新、最近创建、标题排序。
- 日记列表支持分页和总数显示。
- 支持将日记归档隐藏，历史版本不会删除。
- 编辑页会提示基于旧版本保存的非阻塞冲突状态。

## v0.2 功能

- 修复保存中继续输入时的未保存状态追踪。
- 恢复历史版本始终创建新的 `RESTORE` 版本。
- API 返回统一错误结构。
- 手动保存支持填写保存说明。
- 历史页支持按 `MANUAL`、`AUTO`、`RESTORE` 过滤。
- 支持更清晰的 side-by-side diff。
- 编辑页和历史详情页支持基础 Markdown 预览。

## v0.1 功能

- 新建日记
- Markdown 正文编辑
- 用户主动保存
- 每 2 分钟自动保存有改动的内容
- 每次有效保存永久保留为历史版本
- 相同内容不会创建重复版本
- 查看所有历史版本
- 查看任意版本快照
- 比较两个版本差异
- 从历史版本恢复，并创建新的 `RESTORE` 版本

## 快速启动

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

打开 http://localhost:3000 进入日记列表。

## 常用命令

```bash
npm run dev          # 启动开发服务器
npm run lint         # 代码检查
npm run typecheck    # TypeScript 类型检查
npm test             # 单元和集成测试
npm run test:e2e     # Playwright E2E 测试
npm run build        # 生产构建
```

## 历史模型

系统使用两张核心表：

- `Diary`：当前可编辑状态
- `DiaryVersion`：append-only 历史版本

手动保存、自动保存和恢复历史版本都使用同一个保存服务。恢复旧版本不会删除或修改历史，而是创建一个新的 `RESTORE` 版本。
