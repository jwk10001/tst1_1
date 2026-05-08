# Diary History

本项目是一个本地优先的 Web 日记本系统。它使用 Node.js、Next.js、TypeScript、Prisma 和 SQLite 实现类似 Git 的历史记录能力。

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
