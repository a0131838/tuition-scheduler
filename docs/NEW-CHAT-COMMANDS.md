# NEW CHAT COMMANDS

Use these commands at the start of every new conversation window.

## 0) One-click Startup Check (best first step)

```bash
bash ops/server/scripts/new_chat_startup_check.sh
```

This command prints:
- local / origin / server commit alignment
- working tree dirty status
- online health status
- snapshot of `SERVER-HANDOFF`, `CHANGELOG-LIVE`, latest `TASK`, and `RELEASE-BOARD`

## A) Standard Start (recommended)

```txt
先不要改代码。请先读取：
1) docs/SERVER-HANDOFF.md
2) docs/CHANGELOG-LIVE.md
3) docs/tasks/（最新一个 TASK 文件）
4) docs/RELEASE-BOARD.md

然后告诉我：
- 当前线上版本号
- 上一次改了什么
- 还有哪些未完成
- 本次改动风险点

确认后再开始改。
```

## B) Start + Execute

```txt
按“最小改动原则”实施，只改本任务相关文件；改完后更新：
1) docs/CHANGELOG-LIVE.md
2) docs/tasks/TASK-*.md
3) docs/RELEASE-BOARD.md
并给我验收步骤。
```

## C) Emergency Read-only

```txt
先做只读排查，不改代码。输出：根因、影响范围、修复方案A/B、回滚方案。等我确认再改。
```
