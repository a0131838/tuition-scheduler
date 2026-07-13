# 博思学业管家小程序

这是原生微信小程序第一版骨架，面向家长端和员工移动工作台。

## 打开方式

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择：
   `/Users/zhao111/Documents/sgt系统/New project/tuition-scheduler/miniapp/boss-academic-parent`
4. AppID 使用：
   `wxe7017f8545e8ad49`

## 接口地址

后端默认地址在 `utils/config.js`，正式测试使用：

```js
apiBaseUrl: "https://sgtmanage.com"
```

如果需要临时本地联调，可改回：

```js
apiBaseUrl: "http://localhost:3000"
```

然后在主系统目录启动后端：

```bash
npm run dev
```

微信开发者工具里如果访问本地接口受限，可在开发者工具详情里临时关闭“校验合法域名、web-view、TLS 版本以及 HTTPS 证书”。

正式域名测试前，需要在微信公众平台配置：

- `request合法域名`: `https://sgtmanage.com`
- `uploadFile合法域名`: `https://sgtmanage.com`
- `downloadFile合法域名`: `https://sgtmanage.com`

## 登录说明

正式版本的 `utils/config.js` 默认关闭 mock 登录：

```js
devMockOpenId: "",
devMockStaffOpenId: ""
```

需要本地 mock 时只可在未提交的本地副本中临时填写，上传审核前必须恢复为空。生产后端也会忽略 mockOpenId。正式环境需要配置：

- `WECHAT_MINIAPP_APPID`
- `WECHAT_MINIAPP_SECRET`

上传前在主系统目录运行：

```bash
npm run miniapp:audit-release
```

## 当前页面

- 登录
- 员工登录
- 员工绑定
- 员工工作台
- 员工家长请求处理
- 员工学生排课（全部 / 关注 / 首次 / 续排 / 已有未来课程）
- 员工排课与调课
- 员工课程详情、点名与课后反馈
- 老师请假与调课申请
- 老师未来30天可用时间
- 老师报销提交与进度
- 老师月度教学记录
- 邀请码绑定
- 学生列表
- 首页
- 课表
- 课后反馈
- 财务与 PDF 下载
- 请求列表
- 请求详情
- 提交请求与上传附件
