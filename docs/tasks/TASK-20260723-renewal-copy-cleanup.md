# TASK-20260723-renewal-copy-cleanup

## Context

续费页面混入了权限规则和开发机制说明，例如“老师端不显示本页面”。这些内容不帮助教务处理任务，反而占用手机首屏并降低信息密度。

## Change

- 网页标题缩短为“续费跟进”，删除顶部说明段落。
- 小程序删除英文 kicker、工作台后缀和权限说明。
- 删除来源按钮下方重复解释；两个来源按钮本身承担导航。
- 截图提示缩短为“从相册上传截图 / 请先上传发送截图”。
- 保留来源数量、风险、负责人、跟进时间、微信文案和操作按钮。

## Verification

- TypeScript
- 7/7 focused renewal tests
- Native miniapp JavaScript syntax
- 44-page miniapp release audit
- Explicit removed-copy search
- 213-route production build
- `git diff --check`

## Production result

- Runtime feature commit `371f5471d995a438e70e640d1917f66f5a91d06a` aligned locally, on GitHub and on the server.
- PM2 PID `3996895` is online and `/admin/login` returns HTTP 200.
- WeChat development version `1.0.16` uploaded successfully at 529,892 bytes (517.5 KB).
- Experience-version designation and physical-phone visual confirmation remain manual.

## Risk

Low. Presentation only; no business logic or production data changes.
