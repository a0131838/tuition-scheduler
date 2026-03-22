#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/zhw-111/Documents/New project/tuition-scheduler';
const NODE_BIN = '/Users/zhw-111/.nvm/versions/node/v24.14.0/bin/node';
const OPENCLAW_ENTRY = '/Users/zhw-111/.nvm/versions/node/v24.14.0/lib/node_modules/openclaw/openclaw.mjs';
const OPENCLAW_CONFIG = '/Users/zhw-111/.openclaw/openclaw.json';
const WECOM_SDK_ENTRY = '/Users/zhw-111/.openclaw/extensions/wecom-openclaw-plugin/node_modules/@wecom/aibot-node-sdk/dist/index.esm.js';
const WECOM_WS_URL = 'wss://openws.work.weixin.qq.com';
const DELIVERY_STATE_DIR = path.join(ROOT, 'ops/logs/report-delivery');

function fail(msg, detail) {
  console.error(msg);
  if (detail) console.error(detail);
  process.exit(1);
}

function describeError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function recordDeliverySuccess(payload) {
  fs.mkdirSync(DELIVERY_STATE_DIR, { recursive: true });
  const name = path.basename(generatorRelPath, path.extname(generatorRelPath));
  const file = path.join(DELIVERY_STATE_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify({
    sentAt: new Date().toISOString(),
    agentId,
    replyChannel,
    replyTo,
    generatorRelPath,
    payload,
  }, null, 2));
}

function loadWeComConfig() {
  const raw = fs.readFileSync(OPENCLAW_CONFIG, 'utf8');
  const parsed = JSON.parse(raw);
  const wecom = parsed?.channels?.wecom ?? {};
  const botId = String(wecom.botId ?? '').trim();
  const secret = String(wecom.secret ?? '').trim();
  const wsUrl = String(wecom.websocketUrl ?? WECOM_WS_URL).trim() || WECOM_WS_URL;
  if (!botId || !secret) {
    throw new Error('Missing WeCom botId/secret in OpenClaw config');
  }
  return { botId, secret, wsUrl };
}

async function sendViaWeCom(target, text) {
  const [{ WSClient }, { botId, secret, wsUrl }] = await Promise.all([
    import(WECOM_SDK_ENTRY),
    Promise.resolve(loadWeComConfig()),
  ]);

  const client = new WSClient({
    botId,
    secret,
    wsUrl,
    heartbeatInterval: 30000,
    maxReconnectAttempts: 2,
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  await new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { client.disconnect(); } catch {}
      reject(new Error('WeCom connect/auth timeout'));
    }, 15000);

    client.on('authenticated', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve();
    });
    client.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { client.disconnect(); } catch {}
      reject(error instanceof Error ? error : new Error(String(error)));
    });

    client.connect();
  });

  try {
    const result = await client.sendMessage(target, {
      msgtype: 'markdown',
      markdown: { content: text },
    });
    return {
      action: 'send',
      channel: 'wecom',
      dryRun: false,
      handledBy: 'direct-sdk',
      payload: {
        ok: true,
        messageId: result?.headers?.req_id ?? `wecom-${Date.now()}`,
        chatId: target,
      },
    };
  } finally {
    try { client.disconnect(); } catch {}
  }
}

const [,, agentId, replyChannel, replyTo, generatorRelPath] = process.argv;
if (!agentId || !replyChannel || !replyTo || !generatorRelPath) {
  fail('Usage: node ops/codex/send-scheduled-report.mjs <agentId> <replyChannel> <replyTo> <generatorRelPath>');
}

const generatorPath = path.resolve(ROOT, generatorRelPath);
const generated = spawnSync(NODE_BIN, ['--env-file=.env', generatorPath], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 120000,
  maxBuffer: 1024 * 1024,
});
if (generated.error) fail('generate report failed', generated.error.message);
if (generated.status !== 0) fail('generate report failed', `${generated.stdout || ''}\n${generated.stderr || ''}`.trim());
const report = String(generated.stdout || '').trim();
if (!report) fail('generate report failed', 'empty stdout');

try {
  if (replyChannel === 'wecom') {
    const delivered = await sendViaWeCom(replyTo, report);
    recordDeliverySuccess(delivered.payload);
    console.log(JSON.stringify(delivered, null, 2));
  } else {
    // Scheduled reports are fully rendered locally, so send the text directly
    // instead of depending on an agent session/token refresh path.
    const delivered = spawnSync(NODE_BIN, [
      OPENCLAW_ENTRY,
      'message',
      'send',
      '--channel', replyChannel,
      '--target', replyTo,
      '--message', report,
      '--json',
    ], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 1024 * 1024 * 4,
    });
    if (delivered.error) fail('deliver report failed', delivered.error.message);
    if (delivered.status !== 0) fail('deliver report failed', `${delivered.stdout || ''}\n${delivered.stderr || ''}`.trim());
    const parsed = JSON.parse(String(delivered.stdout || '{}'));
    recordDeliverySuccess(parsed?.payload ?? parsed);
    console.log(delivered.stdout.trim());
  }
} catch (error) {
  fail('deliver report failed', describeError(error));
}
