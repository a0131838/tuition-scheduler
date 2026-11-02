import {requireAdmin} from '@/lib/auth';
import {getLang} from '@/lib/i18n';
import ParentReportEditionPanel from '@/app/_components/ParentReportEditionPanel';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireAdmin();const {id}=await params;return <ParentReportEditionPanel kind="MIDTERM" id={id} lang={await getLang()}/>;}
