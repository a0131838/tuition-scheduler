"use client";

import { useState } from "react";
import styles from "../care.module.css";

type ScopeOption = { id: string; label: string; defaultOn: boolean };
type ProgramOption = { value: string; label: string; scopes: ScopeOption[] };

export default function CareProgramSetupFields({
  english,
  programs,
}: {
  english: boolean;
  programs: ProgramOption[];
}) {
  const defaultProgram = programs.find((item) => item.value === "PRE_U_FULL_COORDINATION") ?? programs[0];
  const [programType, setProgramType] = useState(defaultProgram?.value ?? "");
  const selected = programs.find((item) => item.value === programType) ?? defaultProgram;

  return (
    <>
      <label className={styles.label}>
        {english ? "Program" : "服务类型"}
        <select className={styles.select} name="programType" value={programType} onChange={(event) => setProgramType(event.target.value)}>
          {programs.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <fieldset className={`${styles.full} ${styles.section}`} style={{ borderLeft: 0, borderRight: 0, borderTop: 0, margin: 0 }} key={programType}>
        <legend style={{ fontWeight: 800 }}>{english ? "Service scope" : "服务范围"}</legend>
        <div className={styles.scopeGrid}>
          {selected?.scopes.map((item) => (
            <label className={styles.check} key={item.id}>
              <input name="scopeIds" value={item.id} type="checkbox" defaultChecked={item.defaultOn} />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
