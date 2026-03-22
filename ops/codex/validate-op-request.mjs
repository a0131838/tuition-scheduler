#!/usr/bin/env node
import fs from 'node:fs';

function die(msg, code = 1) {
  console.error(`ERROR: ${msg}`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = {
    file: '',
    mode: 'preview',
    hardMax: 200,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--file' || a === '-f') && argv[i + 1]) {
      args.file = argv[++i];
    } else if (a === '--mode' && argv[i + 1]) {
      args.mode = argv[++i];
    } else if (a === '--hard-max' && argv[i + 1]) {
      args.hardMax = Number(argv[++i]);
    } else if (a === '--help' || a === '-h') {
      console.log([
        'Usage: node ops/codex/validate-op-request.mjs --file <json> --mode <preview|apply> [--hard-max 200]',
        '',
        'Validates assistant data-operation request payloads before execution.',
      ].join('\n'));
      process.exit(0);
    }
  }
  return args;
}

function requireString(v, name) {
  if (typeof v !== 'string' || v.trim() === '') die(`${name} must be a non-empty string`);
}

function requirePositiveInt(v, name) {
  if (!Number.isInteger(v) || v <= 0) die(`${name} must be a positive integer`);
}

const { file, mode, hardMax } = parseArgs(process.argv);
if (!file) die('missing --file');
if (!['preview', 'apply'].includes(mode)) die('--mode must be preview or apply');
if (!Number.isInteger(hardMax) || hardMax <= 0) die('--hard-max must be a positive integer');
if (!fs.existsSync(file)) die(`file not found: ${file}`);

let payload;
try {
  payload = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  die(`invalid json: ${e instanceof Error ? e.message : String(e)}`);
}

requireString(payload.operationId, 'operationId');
requireString(payload.task, 'task');

if (!payload.target || typeof payload.target !== 'object') die('target is required');
requireString(payload.target.entity, 'target.entity');
requireString(payload.target.where, 'target.where');

if (!payload.change || typeof payload.change !== 'object') die('change is required');
requireString(payload.change.summary, 'change.summary');

if (!payload.safety || typeof payload.safety !== 'object') die('safety is required');
requirePositiveInt(payload.safety.maxAffected, 'safety.maxAffected');
if (payload.safety.maxAffected > hardMax) {
  die(`safety.maxAffected (${payload.safety.maxAffected}) exceeds hard-max (${hardMax})`);
}
if (typeof payload.safety.forceApply !== 'boolean') die('safety.forceApply must be boolean');
requireString(payload.safety.confirmPhrase, 'safety.confirmPhrase');

if (!payload.preview || typeof payload.preview !== 'object') die('preview is required');
requirePositiveInt(payload.preview.affectedCount, 'preview.affectedCount');
if (!Array.isArray(payload.preview.sampleIds)) die('preview.sampleIds must be an array');

if (!payload.rollback || typeof payload.rollback !== 'object') die('rollback is required');
requireString(payload.rollback.strategy, 'rollback.strategy');

if (mode === 'preview') {
  if (payload.safety.forceApply) die('preview mode requires safety.forceApply=false');
}

if (mode === 'apply') {
  if (!payload.safety.forceApply) die('apply mode requires safety.forceApply=true');
  if (payload.preview.affectedCount > payload.safety.maxAffected) {
    die(`preview.affectedCount (${payload.preview.affectedCount}) exceeds safety.maxAffected (${payload.safety.maxAffected})`);
  }
  requireString(payload.confirmationText, 'confirmationText');
  if (payload.confirmationText.trim() !== payload.safety.confirmPhrase.trim()) {
    die('confirmationText does not match safety.confirmPhrase');
  }
}

console.log('OK');
console.log(JSON.stringify({
  operationId: payload.operationId,
  mode,
  entity: payload.target.entity,
  affectedCount: payload.preview.affectedCount,
  maxAffected: payload.safety.maxAffected,
  forceApply: payload.safety.forceApply,
}, null, 2));
