import { formatBusinessDateOnly } from "@/lib/date-only";
import { loadTeacherCalendarExport } from "@/lib/teacher-calendar-export";
import { notFound } from "next/navigation";
import PrintButton from "./PrintButton";
export default async function CalendarPrint({searchParams}:{searchParams:Promise<Record<string,string>>}) {
  const sp=await searchParams;let data;
  try{data=await loadTeacherCalendarExport(sp.teacherId||'',new URLSearchParams(sp));}catch{notFound();}
  const start=new Date(+data.from-((new Date(+data.from+8*3600000).getUTCDay()+6)%7)*86400000);
  const weeks:Date[][]=[];for(let d=start;d<data.to;d=new Date(+d+7*86400000))weeks.push(Array.from({length:7},(_,i)=>new Date(+d+i*86400000)));
  return <main><style>{`main{font-family:Arial,sans-serif;padding:20px} .calendar-scroll{overflow-x:auto} .calendar-scroll table{min-width:840px} @media print{.calendar-scroll{overflow:visible}.calendar-scroll table{min-width:0}header,nav,aside,button,form{display:none!important}body,main{margin:0!important;padding:0!important}.calendar-row{break-inside:avoid}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aaa;padding:8px;text-align:left}}`}</style><h1>{data.teacher.name} · {data.month}</h1><p>Teacher calendar / 老师课表 · Singapore time / 新加坡时间</p><PrintButton/><form action={`/api/exports/teacher-calendar/${data.teacher.id}`}><input type="month" name="month" defaultValue={data.month}/><select name="view"><option value="month">Month / 月历</option><option value="week">Week / 周清单</option></select><input type="date" name="week" defaultValue={data.month+"-01"}/><button>Download PDF / 下载PDF</button></form>
    <div className="calendar-scroll">{data.view==='month'?<table style={{width:'100%',tableLayout:'fixed'}}><thead><tr>{['Mon / 一','Tue / 二','Wed / 三','Thu / 四','Fri / 五','Sat / 六','Sun / 日'].map(day=><th key={day}>{day}</th>)}</tr></thead><tbody>{weeks.map((week,index)=><tr key={index} className="calendar-row">{week.map(day=><td key={+day} style={{verticalAlign:'top',overflowWrap:'anywhere',border:'1px solid #ccc',padding:6}}><strong>{formatBusinessDateOnly(day)}</strong>{data.lessons.filter(l=>l.date===formatBusinessDateOnly(day)).map(l=><p key={l.id}>{l.time}{l.cancelled?' [X]':''}<br/>{l.students}<br/>{l.course}<br/>{l.place}</p>)}</td>)}</tr>)}</tbody></table>:<table><thead><tr><th>Date / 日期</th><th>Time / 时间</th><th>Student / 学生</th><th>Course / 课程</th><th>Location / 地点</th></tr></thead><tbody>{data.lessons.map(l=><tr className="calendar-row" key={l.id}><td>{l.date}</td><td>{l.time}{l.cancelled?' [Cancelled / 已取消]':''}</td><td>{l.students}</td><td>{l.course}</td><td>{l.place}</td></tr>)}</tbody></table>}</div>
    {[...data.availability,...data.blocks].map((a,i)=><p key={i}>{a.date} · {a.text}</p>)}
  </main>;
}
