import {GET as inventory} from '@/app/api/training/inventory/route';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request, context:{params:Promise<{platform:string}>}) {const {platform}=await context.params;if(!['web','miniapp'].includes(platform))return new Response('Not found',{status:404}); const u=new URL(request.url);u.searchParams.set('platform',platform.toUpperCase());return inventory(new Request(u,request));}
