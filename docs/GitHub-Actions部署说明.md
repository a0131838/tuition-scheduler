# GitHub Actions 部署说明

目标：在本机 SSH 直连服务器不可用时，改由 GitHub Actions 从远端触发服务器部署。

## 1. 适用场景

- 本机无法直连服务器 `22` 端口
- GitHub 可以访问服务器 SSH
- 仍然沿用服务器现有部署脚本：
  - `ops/server/scripts/deploy_app.sh`
  - `ops/server/scripts/health_check.sh`

## 2. 已新增的工作流

- 路径：`.github/workflows/deploy-server.yml`
- 触发方式：GitHub `Actions` 页面手动执行
- 输入项：
  - `branch`：要部署的分支，默认 `feat/strict-superadmin-availability-bypass`

## 3. 需要在 GitHub 仓库 Secrets 里配置的值

进入：

- GitHub Repository
- `Settings`
- `Secrets and variables`
- `Actions`

新增这些 `Repository secrets`：

1. `SERVER_HOST`
   - 服务器 SSH 主机，例如 `13.250.199.59`

2. `SERVER_SSH_USER`
   - 服务器 SSH 用户，例如 `ubuntu`

3. `SERVER_SSH_PRIVATE_KEY`
   - 服务器可登录私钥全文

4. `SERVER_APP_DIR`
   - 服务器项目目录，例如 `/home/ubuntu/apps/tuition-scheduler`

可选：

5. `SERVER_SSH_PORT`
   - 默认 `22`

6. `SERVER_DEPLOY_ENV_FILE`
   - 默认 `ops/server/.deploy.env`

## 4. 怎么执行部署

1. 打开 GitHub 仓库页面
2. 点击 `Actions`
3. 选择 `Deploy Server`
4. 点击 `Run workflow`
5. 选择要部署的分支
6. 点击 `Run workflow`

工作流会依次执行：

1. SSH 登录服务器
2. `git fetch origin`
3. `git checkout <branch>`
4. `git reset --hard origin/<branch>`
5. `bash ops/server/scripts/deploy_app.sh <env file>`
6. `bash ops/server/scripts/health_check.sh <env file>`

## 5. 影响边界

这个方案：

1. 不改业务逻辑
2. 不改服务器现有部署脚本
3. 只是把“谁来触发部署”从本机改成 GitHub Actions

## 6. 当前限制

如果 GitHub Actions 也无法访问服务器 `22` 端口，这个方案也会失败。

那时要改成下一层方案：

1. 服务器主动拉取代码
2. 或云平台网页终端部署

## 7. 当前待上线的改动

你现在最想部署的是：

- `f71fdeb fix(packages): block direct remaining balance edits`

上线后会生效：

1. 课时包编辑页不能直接改 `Remaining / 剩余`
2. 后端会拒绝直接更新 `remainingMinutes`
3. 仍可删除后重录
4. 仍保留受控异常流水修正
