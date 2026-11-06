'use client';
import { useRef, useState } from 'react';
export default function OrderForm({ action, children }: { action: (data: FormData) => Promise<string>; children: React.ReactNode }) {
  const busy = useRef(false); const [pending, setPending] = useState(false); const [error, setError] = useState('');
  return <form action={async data => { if (busy.current) return; busy.current = true; setPending(true); setError(''); try { window.location.assign(await action(data)); } catch { setError('Result could not be confirmed. Reopen this record before retrying / 结果未确认，请重新打开记录核对后再操作'); } }}>
    <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 12, minWidth: 0 }}>{children}</fieldset>
    {pending ? <p role="status">Saving; please wait / 正在保存，请稍候</p> : null}{error ? <p role="alert">{error}</p> : null}
  </form>;
}
