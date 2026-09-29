/** Only an explicit provider rejection or a failure before the send request is safe to retry. */
export class NotificationTransportError extends Error {
  constructor(message: string, readonly outcome: 'NOT_SENT' | 'REJECTED' | 'UNKNOWN', readonly errcode?: number) { super(message); }
}

export async function withNotificationToken<T>(token: () => Promise<string>, send: (token: string) => Promise<T>) {
  let value: string;
  try { value = await token(); }
  catch { throw new NotificationTransportError('Notification token unavailable / 通知凭据暂不可用', 'NOT_SENT'); }
  return send(value);
}

export async function confirmedNotificationResponse(request: () => Promise<Response>) {
  try {
    const response = await request();
    const result = await response.json() as {errcode?: unknown; errmsg?: unknown};
    if (response.ok && result.errcode === 0) return {errcode: 0, errmsg: String(result.errmsg ?? 'ok')};
    if (response.ok && typeof result.errcode === 'number' && Number.isFinite(result.errcode) && result.errcode !== 0)
      throw new NotificationTransportError(`Provider rejected notification (${result.errcode}) / 平台拒绝通知`, 'REJECTED', result.errcode);
    throw new NotificationTransportError('Delivery outcome unconfirmed / 发送结果未确认，请核对', 'UNKNOWN');
  } catch (error) {
    if (error instanceof NotificationTransportError) throw error;
    // A timeout, unreadable body or lost response cannot prove the provider did not send.
    throw new NotificationTransportError('Delivery outcome unconfirmed / 发送结果未确认，请核对', 'UNKNOWN');
  }
}
