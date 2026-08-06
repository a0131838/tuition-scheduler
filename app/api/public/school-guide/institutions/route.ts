import { NextRequest, NextResponse } from "next/server";
import {
  getSchoolGuideOfficialInstitution,
  getSchoolGuideInstitutionDirectoryGroup,
  getSchoolGuideOfficialInstitutions,
} from "@/lib/school-guide-official-institutions";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim() || "";
  if (slug) {
    const institution = getSchoolGuideOfficialInstitution(slug);
    if (!institution) return NextResponse.json({ ok: false, error: "没有找到该学校或教育机构" }, { status: 404 });
    return NextResponse.json({ ok: true, institution }, { headers: { "cache-control": "public, max-age=300, s-maxage=3600" } });
  }

  const category = request.nextUrl.searchParams.get("category")?.trim() || "";
  const group = request.nextUrl.searchParams.get("group")?.trim() || "ALL";
  const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 30)));
  const offset = Math.max(0, Number(request.nextUrl.searchParams.get("offset") || 0));
  const source = getSchoolGuideOfficialInstitutions(category);
  const grouped = group === "ALL" ? source : source.filter((item) => getSchoolGuideInstitutionDirectoryGroup(item) === group);
  const filtered = query
    ? grouped.filter((item) => [item.name, item.nameZh, item.subcategory, item.summary, ...item.badges].join(" ").toLowerCase().includes(query))
    : grouped;
  const items = filtered.slice(offset, offset + limit).map((item) => ({
    slug: item.slug,
    categoryId: item.categoryId,
    subcategory: item.subcategory,
    name: item.name,
    nameZh: item.nameZh,
    summary: item.summary,
    badges: item.badges.slice(0, 4),
    directoryGroup: getSchoolGuideInstitutionDirectoryGroup(item),
    updatedAt: item.updatedAt,
  }));
  return NextResponse.json(
    { ok: true, total: filtered.length, offset, limit, hasMore: offset + items.length < filtered.length, items },
    { headers: { "cache-control": "public, max-age=120, s-maxage=1800, stale-while-revalidate=86400" } },
  );
}
