import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DATASETS = {
  schools: "d_688b934f82c1059ed0a6993d2a829089",
  subjects: "d_f1d144e423570c9d84dbc5102c2e664d",
  programmes: "d_b0697d22a7837a4eddf72efb66a36fc2",
  distinctive: "d_db1faeea02c646fa3abccfa5aba99214",
} as const;

type Row = Record<string, unknown>;

async function fetchAll(resourceId: string) {
  const rows: Row[] = [];
  const limit = 5000;
  for (let offset = 0; ; offset += limit) {
    const url = new URL("https://data.gov.sg/api/action/datastore_search");
    url.searchParams.set("resource_id", resourceId);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    let response = await fetch(url, { headers: { "user-agent": "SGT-School-Guide-Official-Data-Sync/1.0" } });
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      response = await fetch(url, { headers: { "user-agent": "SGT-School-Guide-Official-Data-Sync/1.0" } });
    }
    if (!response.ok) throw new Error(`data.gov.sg ${resourceId}: ${response.status}`);
    const payload = await response.json() as { success: boolean; result?: { total: number; records: Row[] } };
    if (!payload.success || !payload.result) throw new Error(`data.gov.sg ${resourceId}: invalid response`);
    rows.push(...payload.result.records);
    if (rows.length >= payload.result.total) break;
  }
  return rows;
}

function clean(value: unknown) {
  const text = String(value || "").trim();
  return !text || text.toLowerCase() === "na" ? "" : text;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function addToMap(map: Map<string, string[]>, key: unknown, value: unknown) {
  const school = clean(key).toUpperCase();
  const item = clean(value);
  if (!school || !item) return;
  const values = map.get(school) || [];
  if (!values.includes(item)) values.push(item);
  map.set(school, values);
}

async function main() {
  const schools = await fetchAll(DATASETS.schools);
  const subjects = await fetchAll(DATASETS.subjects);
  const programmes = await fetchAll(DATASETS.programmes);
  const distinctive = await fetchAll(DATASETS.distinctive);

  const subjectsBySchool = new Map<string, string[]>();
  const programmesBySchool = new Map<string, string[]>();
  const distinctiveBySchool = new Map<string, string[]>();
  subjects.forEach((row) => addToMap(subjectsBySchool, row.School_Name, row.Subject_Desc));
  programmes.forEach((row) => addToMap(programmesBySchool, row.school_name, row.moe_programme_desc));
  distinctive.forEach((row) => {
    const name = clean(row.school_name).toUpperCase();
    if (!name) return;
    const values = [
      [clean(row.alp_domain), clean(row.alp_title)].filter(Boolean).join("："),
      [clean(row.llp_domain1), clean(row.llp_title)].filter(Boolean).join("："),
    ].filter(Boolean);
    values.forEach((value) => addToMap(distinctiveBySchool, name, value));
  });

  const records = schools.map((row) => {
    const name = clean(row.school_name).toUpperCase();
    return {
      slug: `moe-${slugify(name)}`,
      name,
      address: clean(row.address).replace(/\s+/g, " "),
      postalCode: clean(row.postal_code),
      zone: clean(row.zone_code),
      planningArea: clean(row.dgp_code),
      schoolType: clean(row.type_code),
      gender: clean(row.nature_code),
      session: clean(row.session_code),
      level: clean(row.mainlevel_code),
      nearestMrt: clean(row.mrt_desc),
      buses: clean(row.bus_desc),
      sap: clean(row.sap_ind) === "Yes",
      autonomous: clean(row.autonomous_ind) === "Yes",
      gifted: clean(row.gifted_ind) === "Yes",
      integratedProgramme: clean(row.ip_ind) === "Yes",
      motherTongues: [row.mothertongue1_code, row.mothertongue2_code, row.mothertongue3_code].map(clean).filter(Boolean),
      subjects: subjectsBySchool.get(name) || [],
      moeProgrammes: programmesBySchool.get(name) || [],
      distinctiveProgrammes: distinctiveBySchool.get(name) || [],
      officialUrl: clean(row.url_address),
    };
  });

  const output = {
    version: "2026-MOE-SCHOOL-DIRECTORY",
    sourceUpdatedAt: "2026-04-17",
    generatedAt: new Date().toISOString(),
    source: "MOE School Directory and Information on data.gov.sg",
    licence: "Singapore Open Data Licence",
    datasetIds: DATASETS,
    records,
  };
  const outputDir = path.join(process.cwd(), "data", "school-guide");
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "moe-schools-2026.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ schools: records.length, subjects: subjects.length, programmes: programmes.length, distinctive: distinctive.length }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
