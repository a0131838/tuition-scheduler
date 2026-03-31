import { requireTeacher } from '@/lib/auth';
import { withdrawExpenseClaim } from '@/lib/expense-claims';
import { redirect } from 'next/navigation';

export async function POST(req: Request) {
  const actor = await requireTeacher();
  const formData = await req.formData();
  const claimId = String(formData.get('claimId') ?? '').trim();

  if (!claimId) {
    redirect('/teacher/expense-claims?err=Missing+claim+id');
  }

  try {
    await withdrawExpenseClaim({
      claimId,
      actor,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Withdraw claim failed';
    redirect(`/teacher/expense-claims?err=${encodeURIComponent(message)}`);
  }

  redirect('/teacher/expense-claims?msg=Expense+claim+withdrawn');
}
