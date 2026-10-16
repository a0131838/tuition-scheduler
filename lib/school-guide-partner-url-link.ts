const ASSESSMENT_PAGE = "pages/guide-academic-assessment/guide-academic-assessment";

export function assessmentPartnerMiniappPath(slug: string) {
  return `/${ASSESSMENT_PAGE}?partner=${slug}`;
}

export async function generateAssessmentPartnerUrlLink(slug: string) {
  if (!/^[a-f0-9]{32}$/.test(slug)) throw new Error("Invalid partner link code");
  const appid = String(process.env.WECHAT_MINIAPP_APPID || "").trim();
  const secret = String(process.env.WECHAT_MINIAPP_SECRET || "").trim();
  if (!appid || !secret) throw new Error("小程序 AppID 或密钥尚未配置");
  const tokenUrl = new URL("https://api.weixin.qq.com/cgi-bin/token");
  tokenUrl.searchParams.set("grant_type", "client_credential");
  tokenUrl.searchParams.set("appid", appid);
  tokenUrl.searchParams.set("secret", secret);
  const tokenResponse = await fetch(tokenUrl, { cache: "no-store" });
  const tokenResult = await tokenResponse.json() as { access_token?: string; errcode?: number; errmsg?: string };
  if (!tokenResponse.ok || !tokenResult.access_token) throw new Error(`获取微信凭证失败：${tokenResult.errcode ?? tokenResponse.status}`);
  const response = await fetch(`https://api.weixin.qq.com/wxa/generate_urllink?access_token=${encodeURIComponent(tokenResult.access_token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: ASSESSMENT_PAGE, query: `partner=${slug}`, env_version: "release", is_expire: false }),
    cache: "no-store",
  });
  const result = await response.json() as { url_link?: string; errcode?: number; errmsg?: string };
  if (!response.ok || result.errcode || !result.url_link) throw new Error(`微信生成链接失败：${result.errcode ?? response.status} ${result.errmsg || ""}`.trim());
  if (!/^https:\/\/wxaurl\.cn\//.test(result.url_link)) throw new Error("微信返回的链接地址不符合预期");
  return result.url_link;
}
