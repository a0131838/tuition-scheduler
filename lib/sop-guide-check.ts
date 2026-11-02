import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {findTrainingModule} from './training-center';

type Step = {page:number; title:string; image:string|null; placeholder:boolean};
export type GuideCheck = {page:number;title:string;reason:'MISSING_IMAGE'|'REUSED_IMAGE'};

// Only bundled training HTML is examined. Screenshot reuse is a review clue,
// not evidence that the screenshot is wrong or the guide is otherwise correct.
export function inspectGuideHtml(html:string):GuideCheck[]{
 const steps:Step[]=[];
 for(const match of html.matchAll(/<section class="page zh">([\s\S]*?)<\/section>/g)){
  const section=match[1];
  if(!/中文流程\s*·\s*第\s*\d+\s*步/.test(section))continue;
  const heading=section.match(/<h1>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]*>/g,'').trim();
  const page=Number(section.match(/<footer>[\s\S]*?<span>(\d+)<\/span>\s*<\/footer>/)?.[1]);
  if(!heading||!Number.isInteger(page)||page<1)continue;
  const image=section.match(/<div class="shot">\s*<img\s+src="([^"]+)"/)?.[1]||null;
  steps.push({page,title:heading,image,placeholder:section.includes('class="empty-shot"')});
 }
 const uses=new Map<string,Set<string>>();
 for(const step of steps)if(step.image){const items=uses.get(step.image)||new Set<string>();items.add(step.title);uses.set(step.image,items);}
 return steps.flatMap<GuideCheck>(s=>s.placeholder||!s.image?[{page:s.page,title:s.title,reason:'MISSING_IMAGE' as const}]:uses.get(s.image)!.size>1?[{page:s.page,title:s.title,reason:'REUSED_IMAGE' as const}]:[]);
}
export async function guideScreenshotChecks(code:string):Promise<GuideCheck[]|null>{
 const module=findTrainingModule(code);if(!module)return null;
 // Resolve only known module filenames; never accept a path from the request.
 const filename=module.pdfFile.replace(/\.pdf$/,'.html');
 try{return inspectGuideHtml(await readFile(path.join(process.cwd(),'docs',filename),'utf8'));}catch{return null;}
}
