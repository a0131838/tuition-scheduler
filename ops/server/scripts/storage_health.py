#!/usr/bin/env python3
"""Disk/backup/COS allowance alerts. No business writes, no deletion."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import socket
import time
import urllib.request
import urllib.parse


def read_json(path):
    try: return json.loads(path.read_text())
    except (OSError, ValueError): return {}


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(value))
    tmp.replace(path)


def inspect_health(now, usage, backup, failures, quota):
    percent = math.ceil(100 * usage.used / (usage.used + usage.free))
    free_gib = usage.free / 1024**3
    level = 3 if percent >= 90 or free_gib < 2 else 2 if percent >= 80 or free_gib < 5 else 1 if percent >= 70 else 0
    reasons = []
    keys = []
    if level:
        reasons.append(f'系统盘 Disk: {percent}%, 剩余 Free {free_gib:.1f} GiB')
        keys.append('disk:' + str(level))
    # Require both recently created archives and a recent successful cloud reconciliation.
    if now - backup.get('verifiedAt', 0) > 30 * 3600:
        level = max(level, 2); keys.append('verification-stale')
        reasons.append('云端备份校验超过30小时未成功 / Cloud verification older than 30h')
    for kind in ('uploads', 'database'):
        latest = backup.get('latest', {}).get(kind, 0)
        if now - latest > 30 * 3600:
            level = max(level, 2); keys.append(kind + '-stale')
            reasons.append(kind + ': 超过30小时没有新备份 / No new backup for 30h')
        failed = failures.get(kind, {}).get('failedAt', 0)
        if failed > latest:
            level = max(level, 2); keys.append(kind + '-failed')
            reasons.append(kind + ': 最近备份失败，本地副本保留 / Backup failed; local copies retained')
    used = backup.get('cloudBytes', 0)
    cloud_percent = used * 100 / quota
    if cloud_percent >= 70:
        cloud_level = 3 if cloud_percent >= 90 else 2 if cloud_percent >= 80 else 1
        level = max(level, cloud_level); keys.append('cos:' + str(cloud_level))
        reasons.append(f'SGT云端备份 COS: {used/1024**3:.1f}/{quota/1024**3:.0f} GiB ({cloud_percent:.0f}%). 请检查共享套餐总用量 / Check total shared allowance.')
    return level, reasons, '|'.join(keys)


def send_alert(url, message):
    if not url:
        raise RuntimeError('No alert webhook configured')
    payload = {'msgtype':'text','text':{'content':message}} if urllib.parse.urlparse(url).hostname == 'qyapi.weixin.qq.com' else {'message':message}
    req = urllib.request.Request(url, data=json.dumps(payload,ensure_ascii=False).encode(), headers={'Content-Type':'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=15) as res:
        body = res.read()
        if urllib.parse.urlparse(url).hostname == 'qyapi.weixin.qq.com' and json.loads(body).get('errcode') != 0:
            raise RuntimeError('WeCom rejected alert; will retry on next check')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--backup-failed', choices=['uploads','database'])
    parser.add_argument('--test', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    now = time.time()
    backup_dir = Path(os.getenv('BACKUP_STATE_DIR', '/home/ubuntu/backups/tuition-scheduler/.health'))
    if args.backup_failed:
        try: atomic_json(backup_dir / (args.backup_failed + '-failure.json'), {'failedAt':now})
        except OSError: pass  # Still send even if the disk cannot persist state.
    failures = {k: read_json(backup_dir/(k+'-failure.json')) for k in ('uploads','database')}
    if args.backup_failed: failures[args.backup_failed] = {'failedAt':now}
    usage = shutil.disk_usage(os.getenv('DISK_CHECK_PATH', '/'))
    backup = read_json(backup_dir/'verified.json')
    level, reasons, key = inspect_health(now, usage, backup, failures, int(os.getenv('COS_ALLOWANCE_GIB','100'))*1024**3)
    state_path = Path(os.getenv('STORAGE_ALERT_STATE', '/home/ubuntu/logs/storage-alert-state.json'))
    state = read_json(state_path)
    labels = ['正常 / OK','预警 / WARNING','告警 / ALERT','紧急 / CRITICAL']
    print(json.dumps({'level':labels[level],'diskPercent':math.ceil(100*usage.used/(usage.used+usage.free)),'freeGiB':round(usage.free/1024**3,2),'backupVerifiedAt':backup.get('verifiedAt'),'reasons':reasons},ensure_ascii=False))
    fingerprint = hashlib.sha256(key.encode()).hexdigest()
    cooldown = 900 if level == 3 else 3600 if level == 2 else 21600
    notify = args.test or (level > 0 and (fingerprint != state.get('fingerprint') or now-state.get('sentAt',0)>=cooldown)) or (level == 0 and state.get('level',0)>0)
    if not notify or args.dry_run: return
    if args.test:
        message='SGT 存储监控测试 / Storage monitoring test\n告警渠道连通性验证；无需处理业务记录。\nAlerts: disk 70/80/90%, backups overdue 30h, COS allowance 70/80/90%.'
    else:
        message=f'SGT 存储与备份 {labels[level]}\n{socket.gethostname()}\n'+'\n'.join(reasons or ['容量和备份检查已恢复 / Storage and backup checks recovered'])
    try:
        send_alert(os.getenv('ALERT_WEBHOOK_URL',''),message)
    except Exception as exc:
        # Do not print webhook tokens or record a successful delivery on failure.
        print('ALERT_DELIVERY_FAILED: '+type(exc).__name__)
        raise SystemExit(2)
    print('ALERT_DELIVERED')
    if not args.test:
        try: atomic_json(state_path, {'level':level,'fingerprint':fingerprint,'sentAt':now})
        except OSError: print('WARN: alert delivered but could not save cooldown state')


if __name__ == '__main__':main()
