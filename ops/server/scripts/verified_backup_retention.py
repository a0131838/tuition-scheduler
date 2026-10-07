#!/usr/bin/env python3
"""Keep every cloud archive; prune ONLY checksum-verified local duplicates.
No cloud delete operation exists in this tool. Default is audit-only.
"""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time


def checksums(path):
    before = path.stat()
    md5, sha = hashlib.md5(), hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            md5.update(chunk)
            sha.update(chunk)
    after = path.stat()
    if (before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_ino, after.st_size, after.st_mtime_ns):
        raise RuntimeError('Backup changed during verification: ' + path.name)
    return md5.hexdigest(), sha.hexdigest(), after


def matches_cloud(info, size, md5):
    # Reject multipart/unknown ETags. Never assume they are a checksum.
    return info.get('ContentLength', info.get('Size')) == size and info.get('ETag', '').strip('"').lower() == md5


class Cloud:
    def __init__(self):
        self.bucket = os.environ['S3_BUCKET']
        self.prefix = os.environ['S3_PREFIX'].strip('/') + '/'
        self.tmp = tempfile.TemporaryDirectory(prefix='sgt-aws-', dir='/dev/shm' if Path('/dev/shm').is_dir() else None)
        config = Path(self.tmp.name) / 'config'
        config.write_text('[default]\ns3 =\n  addressing_style = virtual\n')
        self.env = dict(os.environ, AWS_CONFIG_FILE=str(config), AWS_PAGER='')
        aws = shutil.which('aws') or '/snap/bin/aws'
        self.base = [aws, '--region', os.getenv('AWS_DEFAULT_REGION', 'ap-hongkong')]
        if os.getenv('S3_ENDPOINT_URL'):
            self.base += ['--endpoint-url', os.environ['S3_ENDPOINT_URL']]
        self.base += ['s3api']

    def run(self, action, *args):
        p = subprocess.run(self.base + [action, '--bucket', self.bucket, *args, '--output', 'json'], env=self.env, capture_output=True, text=True, timeout=600)
        if p.returncode:
            raise RuntimeError('COS operation failed: ' + action + '; local files retained')
        return json.loads(p.stdout or '{}')

    def listing(self):
        return self.run('list-objects-v2', '--prefix', self.prefix).get('Contents', [])

    def head(self, name):
        return self.run('head-object', '--key', self.prefix + name)

    def upload(self, path, md5, sha):
        args = ['--key', self.prefix + path.name, '--body', str(path), '--content-md5', base64.b64encode(bytes.fromhex(md5)).decode(), '--metadata', 'sha256=' + sha]
        if os.getenv('S3_STORAGE_CLASS'):
            args += ['--storage-class', os.environ['S3_STORAGE_CLASS']]
        self.run('put-object', *args)


def reconcile(directory, cloud, keep=7, upload_missing=False, apply=False, emit=print):
    if keep < 1:
        raise ValueError('keep must be at least 1')
    app = os.getenv('APP_NAME', 'tuition-scheduler')
    pattern = re.compile(re.escape(app) + r'_(?:uploads_\d{8}_\d{6}\.tar\.gz|\d{4}-\d{2}-\d{2}_\d{6}\.dump)$')
    files = sorted(p for p in directory.iterdir() if pattern.fullmatch(p.name) and p.is_file() and not p.is_symlink())
    if not files:
        raise RuntimeError('No recognised backups')
    objects = cloud.listing()
    index = {x['Key']: x for x in objects}
    groups = {kind: [p for p in files if ('uploads_' in p.name) == (kind == 'uploads')] for kind in ('uploads', 'database')}
    retained = {p.name for group in groups.values() for p in group[-keep:]}
    verified = []
    # Whole inventory must verify before any local file can be removed.
    for path in files:
        md5, sha, st = checksums(path)
        if st.st_size <= 0:
            raise RuntimeError('Empty archive: ' + path.name)
        key = cloud.prefix + path.name
        if key not in index:
            if not upload_missing:
                raise RuntimeError('Cloud copy missing: ' + path.name)
            cloud.upload(path, md5, sha)
            info = cloud.head(path.name)
        else:
            info = index[key]
        if not matches_cloud(info, st.st_size, md5):
            raise RuntimeError('Cloud checksum mismatch: ' + path.name)
        row = {'name': path.name, 'bytes': st.st_size, 'md5': md5, 'sha256': sha, 'keepLocal': path.name in retained, 'mtime_ns': st.st_mtime_ns, 'inode': st.st_ino}
        verified.append(row)
        emit(json.dumps({'verified': row}), flush=True)
    latest = {k: max((p.stat().st_mtime for p in g), default=0) for k, g in groups.items()}
    freed = prune_verified(directory, cloud, verified, apply, emit)
    final_objects = cloud.listing()
    result = {'verifiedAt': time.time(), 'verifiedCount': len(verified), 'freedBytes': freed, 'cloudBytes': sum(x['Size'] for x in final_objects), 'cloudObjectCount': len(final_objects), 'latest': latest}
    return result


def prune_verified(directory, cloud, verified, apply, emit=print):
    freed = 0
    for row in verified:
        if row['keepLocal'] or not apply:
            continue
        path = directory / row['name']
        st = path.stat()
        if path.is_symlink() or (st.st_ino, st.st_size, st.st_mtime_ns) != (row['inode'], row['bytes'], row['mtime_ns']):
            raise RuntimeError('Local file changed; stopped: ' + path.name)
        # Recheck existence/checksum immediately before unlinking the duplicate.
        if not matches_cloud(cloud.head(path.name), row['bytes'], row['md5']):
            raise RuntimeError('Cloud copy changed; stopped: ' + path.name)
        path.unlink()
        freed += row['bytes']
        emit(json.dumps({'removedLocalDuplicate': path.name, 'cloudCopyVerified': True}), flush=True)
    return freed


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--apply', action='store_true')
    p.add_argument('--upload-missing', action='store_true')
    p.add_argument('--keep', type=int, default=int(os.getenv('LOCAL_BACKUP_KEEP_COUNT', '7')))
    p.add_argument('--directory', default=os.getenv('BACKUP_DIR', '/home/ubuntu/backups/tuition-scheduler'))
    args = p.parse_args()
    result = reconcile(Path(args.directory), Cloud(), args.keep, args.upload_missing, args.apply)
    state_dir = Path(os.getenv('BACKUP_STATE_DIR', str(Path(args.directory) / '.health')))
    state_dir.mkdir(parents=True, exist_ok=True)
    out = state_dir / 'verified.json'
    tmp = state_dir / 'verified.json.tmp'
    tmp.write_text(json.dumps(result))
    tmp.replace(out)
    print(json.dumps({'summary': result}), flush=True)


if __name__ == '__main__':
    main()
