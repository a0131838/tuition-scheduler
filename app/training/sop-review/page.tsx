import Link from 'next/link';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {getCurrentUser,isOwnerManager,isManagerUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {canManageSops, sopInventory, sopNeedsReview, recordSopReview, reportSopIssue, requireSopEntry} from '@/lib/sop-governance';
import SopAiAssistant from './SopAiAssistant';
const panel={border:'1px solid #dbe5ef',borderRadius:10,padding:18,background:'#fff',marginBottom:16};
async function act(form:FormData){'use server';const user=await getCurrentUser();if(!user)redirect('/admin/login');const v=(k:string)=>String(form.get(k)||'');let error='';
try{if(v('action')==='author-access'){
 if(user.isObserver||!isOwnerManager(user))throw Error('Owner access required / 仅负责人可以授权');
 const target=await prisma.user.findUnique({where:{id:v('userId')},select:{id:true,name:true,email:true,role:true,isObserver:true}});if(!target||target.role==='STUDENT'||target.isObserver)throw Error('Choose an active staff account / 请选择可操作的员工账号');
 const mode=v('mode');if(mode!=='GRANT'&&mode!=='REVOKE')throw Error('Invalid action');
 await prisma.$transaction(async tx=>{if(mode==='GRANT')await tx.sopAuthorAccess.upsert({where:{userId:target.id},create:{userId:target.id,grantedBy:user.email},update:{grantedBy:user.email}});else await tx.sopAuthorAccess.deleteMany({where:{userId:target.id}});await tx.auditLog.create({data:{actorEmail:user.email,actorName:user.name,actorRole:user.role,module:'training',action:'SOP_AUTHOR_'+mode,entityType:'User',entityId:target.id,meta:{targetName:target.name,targetEmail:target.email}}});});
 }else if(v('action')==='feedback')await reportSopIssue(user,v('key'),v('step'),v('message'));
else if(v('action')==='resolve'){
 if(!await canManageSops(user))throw Error('No permission');const issue=await prisma.sopFeedback.findUnique({where:{id:v('id')}});if(!issue)throw Error('Issue not found');await requireSopEntry(user,issue.key);
 if(v('resolution').trim().length<10)throw Error('Describe the correction / 请填写至少10个字符的处理结果');
 await prisma.$transaction(async tx=>{const changed=await tx.sopFeedback.updateMany({where:{id:issue.id,status:'OPEN'},data:{status:'RESOLVED',resolution:v('resolution').slice(0,1500),resolvedBy:user.name,resolvedAt:new Date()}});if(changed.count!==1)throw Error('Issue already resolved / 已处理，请刷新');await tx.auditLog.create({data:{actorEmail:user.email,actorName:user.name,module:'training',action:'SOP_FEEDBACK_RESOLVED',entityId:issue.id,meta:{resolution:v('resolution').slice(0,1500)}}});});
}else await recordSopReview(user,{key:v('key'),decision:v('decision'),expected:v('expected'),ownerName:v('ownerName'),note:v('note'),replacementKey:v('replacementKey'),checked:v('checked')==='on'});
}catch(e){error=e instanceof Error?e.message:'Could not save';}
revalidatePath('/training');revalidatePath('/training/library');revalidatePath('/training/materials');revalidatePath('/training/sop-review');redirect('/training/sop-review?'+(error?'err='+encodeURIComponent(error):'saved=1'));
}
export default async function SopReviewPage({searchParams}:{searchParams:Promise<{key?:string;history?:string;due?:string;err?:string;saved?:string}>}){
 const user=await getCurrentUser();if(!user)redirect('/admin/login');if(user.role==='STUDENT')redirect('/');const sp=await searchParams;
 const manage=await canManageSops(user),owner=!user.isObserver&&isOwnerManager(user);const entries=await sopInventory(user);const keys=entries.map(e=>e.key);
 const issues=await prisma.sopFeedback.findMany({where:{key:{in:keys},...(manage?{}:{reporterId:user.id})},orderBy:{createdAt:'desc'},take:200});
 const canSeeSnapshots=owner||await isManagerUser(user);
 const snapshots=canSeeSnapshots?await prisma.appSetting.findMany({where:{key:{startsWith:'SOP_INVENTORY_SNAPSHOT:'}},select:{key:true,createdAt:true},orderBy:{key:'desc'},take:24}):[];
 const authors=owner?await prisma.sopAuthorAccess.findMany({orderBy:{createdAt:'desc'}}):[];
 const staff=owner?await prisma.user.findMany({where:{role:{not:'STUDENT'},isObserver:false},select:{id:true,name:true,email:true,role:true},orderBy:{name:'asc'}}):[];
 const due=entries.filter(e=>e.review?.status!=='WITHDRAWN'&&sopNeedsReview(e.review));
 const shown=entries.filter(e=>(!sp.key||e.key===sp.key)&&((manage&&sp.history==='1')||!!sp.key||e.review?.status!=='WITHDRAWN')&&(!sp.due||sopNeedsReview(e.review)));
 return <main style={{maxWidth:1180,margin:'auto',padding:24,background:'#f6f8fb',color:'#172033'}}>
 <section style={panel}><h1>SOP inventory & review / SOP目录与复核</h1><p>Use the current guide. If a button or step differs, report it here. / 使用现行指引；按钮或步骤不一致，请在这里反馈。</p>
 <p><Link href="/training">Training / 培训中心</Link> · <Link href="/training/library">PDF library / PDF资料库</Link> · <Link href="/training/materials?category=运营操作SOP">Operational SOP / 运营SOP</Link></p>
 {manage?<><p>Needs review / 待复核：{due.length} · Open feedback / 未处理反馈：{issues.filter(i=>i.status==='OPEN').length}</p><p><Link href="/training/sop-review?due=1">Review queue / 复核待办</Link> · <Link href="/training/sop-review">Current inventory / 当前目录</Link> · <Link href="/training/sop-review?history=1">Archived inventory / 含归档目录</Link> · <a href="/api/training/inventory?format=csv">Export inventory / 导出目录</a></p><p>Review each month and whenever a related feature changes. A due date is a reminder, not proof the guide is wrong. Only the owner can approve or withdraw. / 每月及功能变更时复核；到期提示不代表内容一定错误。负责人审核后才能确认现行或下架。</p></>:null}
 </section>
 {sp.err?<p role="alert">{sp.err}</p>:null}{sp.saved?<p role="status">Saved / 已保存</p>:null}
 {canSeeSnapshots?<details style={panel}><summary>Monthly inventory snapshots / 每月目录快照</summary><p>The system saves an inventory on the first day of each month. / 系统每月1日保存目录快照。</p>{snapshots.length?snapshots.map(x=><p key={x.key}><a href={'/api/training/inventory?month='+encodeURIComponent(x.key.slice(-7))}>{x.key.slice(-7)} CSV</a></p>):<p>No monthly snapshot yet / 暂无月度快照</p>}</details>:null}
 {owner?<details style={panel}><summary>Operational SOP author access / 运营SOP编写权限</summary><p>Grant or remove only the ability to prepare operational SOP drafts; publication remains with the owner. Existing managers already have author access. / 此处只管理运营SOP草稿编写权限，正式发布仍由负责人完成。已有管理者自带编写权限。</p><form action={act}><input type="hidden" name="action" value="author-access"/><label>Staff account / 员工账号 <select name="userId" required>{staff.map(u=><option key={u.id} value={u.id}>{u.name} · {u.email} · {u.role}{authors.some(a=>a.userId===u.id)?' · Granted':''}</option>)}</select></label><label> Action / 操作 <select name="mode"><option value="GRANT">Grant / 授予</option><option value="REVOKE">Remove grant / 移除授权</option></select></label><button>Save access / 保存授权</button></form></details>:null}
 {manage?<SopAiAssistant/>:null}
 {shown.map(e=><article key={e.key} style={panel}><h2>{e.titleEn}<br/>{e.title}</h2><p>{e.version} · {e.roles} · {e.platform}</p><p>Status / 状态：{e.review?.status==='WITHDRAWN'?'Withdrawn / 已下架':sopNeedsReview(e.review)?'Review needed / 待复核':'Current / 现行'} · Owner / 负责人：{e.review?.ownerName||e.defaultOwner}</p><p>Last checked / 最后核对：{e.review?.reviewedAt?.toISOString().slice(0,10)||'Not recorded / 未记录'} · Next review / 下次复核：{e.review?.nextReviewAt?.toISOString().slice(0,10)||'Pending / 待安排'}</p>
 {e.review?.note?<p style={{whiteSpace:'pre-wrap'}}>{e.review.note}</p>:null}
 {e.review?.status==='WITHDRAWN'?<p>This version has been withdrawn. / 此版本已下架。{e.review.replacementKey?<Link href={'/training/sop-review?key='+encodeURIComponent(e.review.replacementKey)}>Open replacement / 查看新版</Link>:null}</p>:<a href={e.url} target="_blank" rel="noreferrer">Open guide / 打开指引</a>}
 {!user.isObserver?<details><summary>Report an outdated or unclear step / 反馈过时或不清楚的步骤</summary><form action={act} style={{display:'grid',gap:8}}><input type="hidden" name="action" value="feedback"/><input type="hidden" name="key" value={e.key}/><label>Step or page / 步骤或页码 <input name="step" required maxLength={120}/></label><label>What differs? / 哪里不一致？<textarea name="message" required minLength={10} maxLength={2000}/></label><button>Send feedback / 提交反馈</button></form></details>:null}
 {manage?<details><summary>Manage review / 管理复核</summary><form action={act} style={{display:'grid',gap:8}}><input type="hidden" name="key" value={e.key}/><input type="hidden" name="expected" value={e.review?.updatedAt.toISOString()||''}/><label>Owner / 负责人 <input name="ownerName" defaultValue={e.review?.ownerName||e.defaultOwner} required maxLength={100}/></label><label>Review or correction note / 核对或修改说明<textarea name="note" required minLength={10} maxLength={1500}/></label>
 {owner?<><label>Replacement (when withdrawing) / 下架后替代版本<select name="replacementKey"><option value="">No replacement / 暂无</option>{entries.filter(t=>t.key!==e.key&&t.published&&t.review?.status==='CURRENT'&&!t.review.replacementKey&&e.accessRoles.every(role=>t.accessRoles.includes(role))).map(t=><option key={t.key} value={t.key}>{t.title}</option>)}</select></label><label><input type="checkbox" name="checked"/> I verified the live buttons, screenshots, and a colleague's independent walkthrough. / 已核对真实按钮、截图，并由同事独立试操作。</label></>:null}<label>Decision / 处理方式 <select name="decision" defaultValue="FLAG"><option value="FLAG">Mark for correction / 标记待修改</option>{owner?<><option value="CHECK">Confirm current; review next month / 确认现行，下月复核</option><option value="WITHDRAW">Withdraw old version / 下架旧版</option></>:null}</select></label><button type="submit">Save decision / 保存处理</button></form></details>:null}
 </article>)}
 <section style={panel}><h2>Feedback / 步骤反馈</h2>{issues.map(i=><article key={i.id} style={{borderTop:'1px solid #ddd',padding:12}}><strong>{entries.find(e=>e.key===i.key)?.title} · {i.step}</strong><p>{i.message}</p><small>{i.reporterName} · {i.createdAt.toISOString().slice(0,10)} · {i.status}</small>{i.resolution?<p>{i.resolution} · {i.resolvedBy}</p>:null}{manage&&i.status==='OPEN'?<form action={act}><input type="hidden" name="action" value="resolve"/><input type="hidden" name="id" value={i.id}/><textarea name="resolution" minLength={10} maxLength={1500} required placeholder="Describe what was corrected / 写清处理结果"/><button>Resolve / 标记已处理</button></form>:null}</article>)}</section>
 </main>;
}
