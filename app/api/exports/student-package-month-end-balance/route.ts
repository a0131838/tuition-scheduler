import { requireAdmin } from "@/lib/auth";
import { getLang, type Lang } from "@/lib/i18n";
import {
  listStudentPackageMonthEndBalances,
  minutesToHours,
  parseMonthInput,
} from "@/lib/student-package-month-end-balance";

function csvEscape(value: unknown) {
  const raw = String(value ?? "");
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function choose(lang: Lang, en: string, zh: string) {
  if (lang === "EN") return en;
  if (lang === "ZH") return zh;
  return `${en} / ${zh}`;
}

function formatAmountBasisSource(lang: Lang, source: string) {
  if (source === "PURCHASE_TXNS") {
    return choose(lang, "Purchase ledger amounts", "购买流水金额");
  }
  if (source === "RECEIPTS") {
    return choose(lang, "Receipt totals", "收据金额");
  }
  if (source === "PACKAGE_PAID_AMOUNT") {
    return choose(lang, "Package paid amount", "课包付款金额");
  }
  return choose(lang, "No amount basis", "无金额基数");
}

export async function GET(req: Request) {
  await requireAdmin();
  const lang = await getLang();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ?? "";

  if (!parseMonthInput(month)) {
    return new Response("Invalid month format. Use YYYY-MM.", { status: 400 });
  }

  const rows = await listStudentPackageMonthEndBalances(month);
  const header = [
    choose(lang, "Month", "月份"),
    choose(lang, "Month End", "月末日期"),
    choose(lang, "Student", "学生"),
    choose(lang, "Course", "课程"),
    choose(lang, "Package ID", "课包ID"),
    choose(lang, "Package Status", "课包状态"),
    choose(lang, "Purchased Hours", "累计购入课时"),
    choose(lang, "Used Hours", "累计已用课时"),
    choose(lang, "Remaining Hours", "剩余课时"),
    choose(lang, "Paid Amount Basis", "金额基数"),
    choose(lang, "Amount Basis Source", "金额基数来源"),
    choose(lang, "Estimated Remaining Amount", "估算剩余金额"),
  ];

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.month,
        row.monthEnd,
        row.studentName,
        row.courseName,
        row.packageId,
        row.packageStatus,
        minutesToHours(row.totalPurchasedMinutes).toFixed(2),
        minutesToHours(row.usedMinutes).toFixed(2),
        minutesToHours(row.remainingMinutes).toFixed(2),
        row.paidAmountBasis.toFixed(2),
        formatAmountBasisSource(lang, row.paidAmountBasisSource),
        row.remainingAmount.toFixed(2),
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const fileName = `student-package-month-end-balance-${month}.csv`;
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
