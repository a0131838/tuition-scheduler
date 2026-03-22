# 小赵 API 优先调用说明

更新日期：2026-03-05

## 1. 目标

让小赵优先走 API 查询通道，不直接连库。

## 2. 鉴权

请求头：
- `x-ops-key: <OPENCLAW_OPS_KEY>`

来源限制：
- 仅允许 `OPENCLAW_OPS_IP_ALLOWLIST` 中的来源 IP（默认仅本机 loopback）。

建议命令（本机）：
```bash
OPS_KEY=$(node --env-file=.env -e 'console.log(process.env.OPENCLAW_OPS_KEY||"")')
```

## 3. 常用查询

1. 按姓名查学生候选
```bash
curl -s "http://127.0.0.1:3000/api/admin/ops/lookup-student?name=贾皓宇&limit=20" \
  -H "x-ops-key: $OPS_KEY"
```

2. 查最近工单（按 studentId）
```bash
curl -s "http://127.0.0.1:3000/api/admin/ops/recent-tickets?studentId=6be9e26a-fb28-49f2-917e-84dc12cd8baa&limit=10" \
  -H "x-ops-key: $OPS_KEY"
```

3. 查最近30天课包流水（按姓名）
```bash
curl -s "http://127.0.0.1:3000/api/admin/ops/package-txns?name=贾皓宇&days=30&limit=50" \
  -H "x-ops-key: $OPS_KEY"
```

## 4. 兜底策略

若 API 不可用，再使用本地脚本：
- `node --env-file=.env ops/codex/query-student-by-name.mjs "姓名"`
- `node --env-file=.env ops/codex/query-recent-tickets-by-name.mjs "姓名" 10`
- `node --env-file=.env ops/codex/query-package-txns-by-name.mjs "姓名" 30 50`
