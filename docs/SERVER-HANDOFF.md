# SERVER HANDOFF

This file is the fixed handoff for new chat windows.  
Always read this first before any deploy or server troubleshooting.

## 1) Server Profile

- Domain: `https://sgtmanage.com`
- Health URL: `https://sgtmanage.com/admin/login`
- SSH Host: `43.128.46.115`
- SSH User: `ubuntu`
- App Dir: `/home/ubuntu/apps/tuition-scheduler`
- PM2 App Name: `tuition-scheduler`
- Key file path (local machine): `/Users/zhao111/Documents/sgt系统/.ssh/tuition_scheduler888.pem`

## 2) Local Config (do once per machine)

1. Copy `ops/server/server-handoff.env.example` to `ops/server/server-handoff.env`
2. Confirm key path and host are correct
3. `ops/server/server-handoff.env` is git-ignored

## 3) One-command Operations

- New chat startup check (recommended first command):
  - `bash ops/server/scripts/new_chat_startup_check.sh`
- Quick health check:
  - `bash ops/server/scripts/quick_check.sh`
- Quick deploy (default branch from config):
  - `bash ops/server/scripts/quick_deploy.sh`
- Quick deploy (specific branch):
  - `bash ops/server/scripts/quick_deploy.sh ops/server/server-handoff.env feat/strict-superadmin-availability-bypass`

## 4) New Chat Startup Command

```txt
先不要改代码。先读取：
1) docs/SERVER-HANDOFF.md
2) docs/CHANGELOG-LIVE.md
3) docs/tasks/（最新 TASK 文件）
4) docs/RELEASE-BOARD.md
确认后再开始执行。
```

## 5) Safety Rules

- No business logic edits during server diagnostics.
- If deploy may impact other modules, list impact first and wait for approval.
- For emergency bypass of release-doc gate, use `SKIP_RELEASE_DOC_CHECK=true` only temporarily.
- Read and follow `docs/HIGH-RISK-AREAS.md` before any database or deploy operation.
