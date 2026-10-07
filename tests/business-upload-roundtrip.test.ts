import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BUSINESS_UPLOAD_PREFIX, storeBusinessUpload, buildStoredBusinessFileResponse } from '../lib/business-file-storage';

test('isolated screenshot upload reads back byte-for-byte and preserves existing attachment', async () => {
  const original = process.cwd();
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sgt-upload-roundtrip-'));
  try {
    process.chdir(dir);
    const folder = path.join(dir, 'public/uploads/communications');
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, 'existing.png'), 'existing-content');
    const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
    const file = new File([bytes], 'evidence.png', { type: 'image/png' });
    const stored = await storeBusinessUpload(file, { allowedPrefix: BUSINESS_UPLOAD_PREFIX.communications, maxBytes: 10*1024*1024 });
    const response = await buildStoredBusinessFileResponse(new Request('http://localhost/evidence'), { allowedPrefix: BUSINESS_UPLOAD_PREFIX.communications, relativePath: stored.relativePath, originalFileName: file.name, fallbackFileName: 'evidence.png' });
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    assert.equal(await readFile(path.join(folder, 'existing.png'), 'utf8'), 'existing-content');
    await assert.rejects(storeBusinessUpload(file, { allowedPrefix: BUSINESS_UPLOAD_PREFIX.communications, maxBytes: 1 }), /File too large/);
    assert.equal(await readFile(path.join(folder, 'existing.png'), 'utf8'), 'existing-content');
  } finally { process.chdir(original); await rm(dir, { recursive: true, force: true }); }
});
