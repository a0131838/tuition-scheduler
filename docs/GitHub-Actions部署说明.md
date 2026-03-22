# GitHub Actions 部署说明

## 用途
通过 GitHub Actions 手动触发服务器部署，不再依赖本机 SSH。

## 当前服务器
- Host: `43.128.46.115`
- SSH User: `ubuntu`
- App Dir: `/home/ubuntu/apps/tuition-scheduler`

当前 workflow 已内置服务器 Host，不再需要配置 `SERVER_HOST`。

## 需要的 Repository Secrets
在仓库 `Settings -> Secrets and variables -> Actions` 中配置：

1. `SERVER_SSH_USER`
   - 值：`ubuntu`

2. `SERVER_SSH_PRIVATE_KEY`
   - 值：`/Users/zhw-111/Desktop/.ssh/tuition_scheduler888.pem` 文件的完整内容

3. `SERVER_APP_DIR`
   - 值：`/home/ubuntu/apps/tuition-scheduler`

## 可选 Secrets
1. `SERVER_SSH_PORT`
   - 默认：`22`

2. `SERVER_DEPLOY_ENV_FILE`
   - 默认：`ops/server/.deploy.env`

## 运行方法
1. 打开仓库 `Actions`
2. 选择 `Deploy Server`
3. 点击 `Run workflow`
4. branch 选择：本次要发布的真实分支（不要默认旧分支）
5. 再点 `Run workflow`

## 服务器实际执行内容
```bash
cd /home/ubuntu/apps/tuition-scheduler
git fetch origin
git checkout <你选择的分支>
git reset --hard origin/<你选择的分支>
bash ops/server/scripts/deploy_app.sh ops/server/.deploy.env
```

## 验收
workflow 成功后，会在服务器执行：
```bash
pm2 status
curl -I https://sgtmanage.com
```

## 注意
1. 不要用 `Re-run jobs` 验证旧失败记录，优先新开一次 `Run workflow`
2. 如果失败，直接查看失败步骤日志
3. 如果 SSH 连不通，优先检查腾讯云安全组和服务器登录方式
4. 如果发布后出现“功能变少”，先检查是否发布到旧分支
5. 生产数据库以 Neon 为准，禁止切回 localhost 数据库
