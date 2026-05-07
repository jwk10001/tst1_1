# CLAUDE.md

## Project

本项目是一个本地优先的 Node.js Web 日记本系统，使用 Next.js、TypeScript、Prisma 和 SQLite。核心目标是为每篇日记保留类似 Git commit 的完整历史记录。

## Commands

- `npm run dev`：启动开发服务器
- `npm run lint`：运行 lint
- `npm run typecheck`：运行 TypeScript 检查
- `npm test`：运行 Vitest 测试
- `npm run build`：生成 Prisma Client 并构建 Next.js 应用
- `npx prisma migrate dev --name <name>`：创建本地 SQLite migration

## Invariants

- `DiaryVersion` 是 append-only，普通业务逻辑不得修改或删除历史版本。
- 手动保存、自动保存、恢复历史版本必须复用 `saveDiaryVersion`。
- 保存前必须通过内容 hash 去重，相同内容不能创建重复版本。
- 恢复历史版本必须创建新的 `RESTORE` 版本，不能回滚或覆盖历史。
- 自动保存和手动保存产生的有效版本必须永久保留。
- 不要在日志中打印日记正文。

## Testing

修改版本历史逻辑时，必须补充或更新测试，至少覆盖：

- 相同内容不创建重复版本
- 改动内容创建新版本
- 版本号递增
- 恢复历史创建新版本
- diff 能反映新增和删除

## Safety

需要人工确认的操作：

- 安装或降级依赖
- 删除文件
- 数据库 reset 或破坏性 migration
- commit、push、release
- 修改生产配置
