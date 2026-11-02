import {getCurrentUser,isManagerUser} from '@/lib/auth';
import {SOP_CURRENT_GUIDES} from '@/lib/sop-current-guides';
import {isOperationsSopAuthor} from '@/lib/teacher-training-materials';
import {prisma} from '@/lib/prisma';
import {readFile} from 'node:fs/promises';import path from 'node:path';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{code:string}>}){const user=await getCurrentUser();if(!user||user.role==='STUDENT')return new Response('Unauthorized',{status:401});const {code}=await params;const guide=SOP_CURRENT_GUIDES.find(g=>g.code===code);if(!guide||!(guide.roles.some(r=>r===user.role)||user.trainingRoles.some(r=>guide.roles.some(gr=>gr===r))||await isManagerUser(user)||await isOperationsSopAuthor(user)))return new Response('Forbidden',{status:403});const review=await prisma.sopReview.findUnique({where:{key:'GUIDE:'+code}});if(review?.status==='WITHDRAWN')return Response.redirect(new URL('/training/sop-review?key='+encodeURIComponent(review.replacementKey||'GUIDE:'+code),req.url),303);const bytes=await readFile(path.join(process.cwd(),'output/pdf',guide.pdfFile));return new Response(bytes,{headers:{'Content-Type':'application/pdf','Cache-Control':'private, no-store','Content-Disposition':`inline; filename="${guide.pdfFile}"`}});}
