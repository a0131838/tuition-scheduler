# CODEX 生产发布指挥模板

把下面整段发给 Codex 即可。

---

按生产标准流程发布到 server，不允许手工 rsync 应急发布。

本次目标：
- 分支：`<填写分支名>`
- 站点：`https://sgtmanage.com`
- 要求：保持其他功能逻辑不变

执行要求：
1. 先确认本地分支与远程分支状态（ahead/behind）
2. 本地先跑 `npm run build`
3. 本地先跑 `bash ops/server/scripts/quick_check.sh`，确认线上健康和当前版本
4. 仅提交本次改动并 push 到目标分支
5. 更新发布文档（CHANGELOG-LIVE / RELEASE-BOARD / TASK）
6. SSH 到 `43.128.46.115`，执行标准部署脚本：
   `bash /home/ubuntu/apps/tuition-scheduler/ops/server/scripts/deploy_app.sh /home/ubuntu/apps/tuition-scheduler/ops/server/.deploy.env`
6. 发布后验证：
   - `pm2 ls`
   - `/admin/login` 返回 200
   - `/admin/shared-docs` 未登录应 307 跳转到 `/admin/login`
7. 最终输出：
   - 发布 commit hash
   - 实际执行的部署命令
   - 三项验证结果
   - 可回滚 commit

安全要求：
- 不在聊天中暴露任何密钥、PAT、数据库密码
- 若发现 `ops/server/.deploy.env` 缺关键变量（DATABASE_URL、DIRECT_DATABASE_URL、SHARED_DOC_*），先修复再部署
- 若发现 DB 指向 localhost，立即停止发布并修复为 Neon 后再继续
- 若标准流程失败，先说明失败原因和修复动作，再继续，不要静默跳过

---

## 可选：加一句给 Codex

如果你希望它更谨慎，可以再加：

`部署前先 dry-run 检查，任何可能影响其他模块的变更先告知我。`
