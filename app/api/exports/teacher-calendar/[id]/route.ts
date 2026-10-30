import { loadTeacherCalendarExport } from "@/lib/teacher-calendar-export";
import { setPdfFont } from "@/lib/pdf-font";
import { formatBusinessDateOnly } from "@/lib/date-only";
import PDFDocument from "pdfkit";
export async function GET(req: Request, {params}: {params:Promise<{id:string}>}) {
  try {
    const data=await loadTeacherCalendarExport((await params).id,new URL(req.url).searchParams);
    const doc=new PDFDocument({size:'A4',layout:data.view==='month'?'landscape':'portrait',margin:30});setPdfFont(doc);
    const chunks:Buffer[]=[]; const done=new Promise<Buffer>((resolve,reject)=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
    const heading=()=>{doc.fontSize(15).text(`${data.teacher.name} · ${data.month} · Teacher calendar / 老师课表`,30,30,{width:doc.page.width-60});doc.fontSize(9).text(`Singapore time / 新加坡时间 · ${formatBusinessDateOnly(data.from)} – ${formatBusinessDateOnly(new Date(+data.to-1))}`);doc.moveDown();};heading();
    if(data.view==='week') {
      for(const lesson of data.lessons){const text=`${lesson.date} ${lesson.time}${lesson.cancelled?' [Cancelled / 已取消]':''}\n${lesson.students}\n${lesson.course} · ${lesson.place}`;doc.fontSize(10);if(doc.y+doc.heightOfString(text)+18>doc.page.height-40){doc.addPage();setPdfFont(doc);heading();}doc.text(text).moveDown();}
      if(!data.lessons.length)doc.text('No lessons / 没有课程');
      for(const a of [...data.availability,...data.blocks])doc.fontSize(9).text(a.date+' · '+a.text).moveDown();
    }else {
      const width=(doc.page.width-60)/7;let date=new Date(data.from);const weekday=(new Date(+date+8*3600000).getUTCDay()+6)%7;date=new Date(+date-weekday*86400000);
      while(date<data.to){const cells=Array.from({length:7},(_,i)=>{const day=new Date(+date+i*86400000),key=formatBusinessDateOnly(day);const rows=data.lessons.filter(l=>l.date===key);return `${key}\n${rows.map(l=>`${l.time}${l.cancelled?' [X]':''}\n${l.students}\n${l.course}\n${l.place}`).join('\n\n')}${[...data.availability,...data.blocks].filter(a=>a.date===key).map(a=>'\n'+a.text).join('')}`;});doc.fontSize(8);const height=Math.max(85,...cells.map(text=>doc.heightOfString(text,{width:width-10})+14));if(height>doc.page.height-115){doc.addPage();setPdfFont(doc);heading();for(const text of cells){doc.fontSize(9).text(text,{width:doc.page.width-60}).moveDown();}}else{if(doc.y+height>doc.page.height-35){doc.addPage();setPdfFont(doc);heading();}const y=doc.y;cells.forEach((text,i)=>{doc.rect(30+i*width,y,width,height).stroke('#cccccc');doc.text(text,35+i*width,y+6,{width:width-10});});doc.y=y+height+6;doc.x=30;}date=new Date(+date+7*86400000);}
    }
    doc.end();const buffer=await done;return new Response(new Uint8Array(buffer),{headers:{'content-type':'application/pdf','content-disposition':`attachment; filename="teacher-calendar-${data.month}.pdf"`,'cache-control':'private, no-store'}});
  }catch(e){const status=Number(e instanceof Error?e.message:'');return new Response([400,401,403,404].includes(status)?'Calendar unavailable / 无法读取课表':'Export failed / 导出失败',{status:[400,401,403,404].includes(status)?status:500});}
}
