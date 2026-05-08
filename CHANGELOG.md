# Changelog

## 0.2.0

- 修复保存中继续输入可能被误标为已保存的问题。
- 修复恢复历史版本时 `RESTORE` 版本可能被 hash 去重跳过的问题。
- 统一 API 错误响应，补充 diary/version 不存在和 diff 参数错误处理。
- 添加手动保存说明、历史类型过滤、side-by-side diff 和 Markdown 预览。
- 补充版本历史 integration tests，并将 CI 扩展到迁移和 E2E。

## 0.1.0

- 初始化本地优先 Web 日记本系统。
- 添加 Markdown 编辑、手动保存和 2 分钟自动保存。
- 添加 append-only 历史版本模型。
- 添加历史版本查看、diff 和 restore 设计。
