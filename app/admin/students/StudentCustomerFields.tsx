"use client";
import { useEffect, useState } from "react";
import CandidatePicker from "../relationships/map/CandidatePicker";
import type { NetworkNode } from "@/lib/sales-network-types";
import { networkText as tr } from "@/lib/sales-network-types";
type User = { id: string; name: string };
export function readStudentCustomerForm(fd: FormData) {
  return {
    requestId: String(fd.get("customerRequestId") ?? ""),
    existingStudentId: String(fd.get("existingStudentId") ?? ""),
    distinctIdentityNote: String(fd.get("distinctIdentityNote") ?? ""),
    ownerUserId: String(fd.get("customerOwnerId") ?? ""),
    collaboratorUserIds:
      fd.get("existingStudentId") &&
      !fd.getAll("customerCollaboratorIds").length
        ? undefined
        : fd.getAll("customerCollaboratorIds").map(String),
    parentNodeId: String(fd.get("customerParentNodeId") ?? ""),
    parentAccountId: String(fd.get("customerParentAccountId") ?? ""),
    guardianName: String(fd.get("customerGuardianName") ?? ""),
    guardianPhone: String(fd.get("customerGuardianPhone") ?? ""),
    guardianRelationship: String(fd.get("customerGuardianRelationship") ?? ""),
    guardianConfirmed: fd.get("customerGuardianConfirmed") === "on",
    sourceNodeId: String(fd.get("customerSourceNodeId") ?? ""),
    sourceMeaning: String(fd.get("customerSourceMeaning") ?? "CONTACT"),
    sourceConfirmed: fd.get("customerSourceConfirmed") === "on",
    reviewNote: String(fd.get("customerReviewNote") ?? ""),
  };
}
export default function StudentCustomerFields({
  lang,
  users,
  nodes,
  actorId,
  manager,
  canLink,
}: {
  lang: string;
  users: User[];
  nodes: NetworkNode[];
  actorId: string;
  manager: boolean;
  canLink: boolean;
}) {
  const t = (en: string, zh: string) => tr(lang, en, zh);
  const [id, setId] = useState(""),
    [reuse, setReuse] = useState(""),
    [parentMode, setParentMode] = useState("NONE"),
    [parentId, setParentId] = useState(""),
    [ownerId, setOwnerId] = useState(
      users.some((u) => u.id === actorId) ? actorId : "",
    );
  useEffect(() => setId(crypto.randomUUID()), []);
  const own = users.some((u) => u.id === actorId) ? actorId : "";
  return (
    <fieldset
      style={{
        border: "1px solid #d8e5df",
        borderRadius: 7,
        padding: 14,
        display: "grid",
        gap: 10,
        margin: "8px 0",
      }}
    >
      <legend>
        {t("Customer ownership & connections", "客户归属与关系关联")}
      </legend>
      <input type="hidden" name="customerRequestId" value={id} />
      {canLink ? (
        <details>
          <summary>
            {t(
              "Existing student? Reuse the exact profile",
              "已有学生？选择准确档案复用",
            )}
          </summary>
          <CandidatePicker
            lang={lang}
            type="STUDENT"
            onSelect={(c) => {
              setReuse(c.id);
              setOwnerId("");
            }}
          />
          <input type="hidden" name="existingStudentId" value={reuse} />
          {reuse ? (
            <p>
              {t(
                "Existing profile selected. Its original data will be preserved.",
                "已选择已有档案，保留原有资料，不重复建档。",
              )}{" "}
              <button type="button" onClick={() => setReuse("")}>
                {t("Clear", "清除")}
              </button>
            </p>
          ) : null}
        </details>
      ) : null}
      <label>
        {t("Main customer owner", "客户主负责人")}
        <select
          name="customerOwnerId"
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
        >
          <option value="">
            {t(
              "Automatic: preserve owner / new customer belongs to me",
              "自动：保留已有负责人／新客户归我",
            )}
          </option>
          {users
            .filter((u) => manager || u.id === actorId)
            .map((u) => (
              <option value={u.id} key={u.id}>
                {u.name} · {u.id.slice(-4)}
              </option>
            ))}
        </select>
      </label>
      <label>
        {t("Collaborators (multiple)", "协作人（可多选）")}
        <select
          name="customerCollaboratorIds"
          multiple
          style={{ width: "100%", minHeight: 65 }}
        >
          {users.map((u) => (
            <option value={u.id} key={u.id}>
              {u.name} · {u.id.slice(-4)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("Parent / guardian", "家长／监护人")}
        <select
          value={parentMode}
          onChange={(e) => {
            setParentMode(e.target.value);
            setParentId("");
          }}
        >
          <option value="NONE">{t("Not confirmed yet", "暂未确认")}</option>
          <option value="CUSTOMER">
            {t("Existing parent customer", "已有家长客户")}
          </option>
          {canLink ? (
            <option value="ACCOUNT">
              {t("Existing registered parent account", "已有系统家长账号")}
            </option>
          ) : null}
          <option value="NEW">
            {t(
              "New contact (no portal access granted)",
              "新增联系资料（不开通家长端权限）",
            )}
          </option>
        </select>
      </label>
      {parentMode === "CUSTOMER" ? (
        <select
          name="customerParentNodeId"
          aria-label={t("Select parent customer", "选择家长客户")}
        >
          <option value="">{t("Choose exact parent", "选择准确家长")}</option>
          {nodes
            .filter((n) => n.kind === "PARENT" && !n.archived)
            .map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} ·{" "}
                {n.guardianContact?.phone?.slice(-4) || n.id.slice(-4)}
              </option>
            ))}
        </select>
      ) : null}
      {parentMode === "ACCOUNT" ? (
        <>
          <CandidatePicker
            lang={lang}
            type="PARENT"
            onSelect={(c) => setParentId(c.id)}
          />
          <input
            type="hidden"
            name="customerParentAccountId"
            value={parentId}
          />
        </>
      ) : null}
      {parentMode === "NEW" ? (
        <>
          <input
            name="customerGuardianName"
            placeholder={t("Guardian name", "监护人姓名")}
          />
          <input
            name="customerGuardianPhone"
            placeholder={t(
              "Contact phone with country code",
              "联系电话（含国家代码）",
            )}
          />
        </>
      ) : null}
      {parentMode !== "NONE" ? (
        <>
          <input
            name="customerGuardianRelationship"
            placeholder={t(
              "e.g. mother / father / guardian",
              "例如：母亲／父亲／监护人",
            )}
          />
          <label>
            <input type="checkbox" name="customerGuardianConfirmed" />
            {t(
              "I verified this guardian–student relationship",
              "我已核对该监护人与学生的关系",
            )}
          </label>
        </>
      ) : null}
      <label>
        {t("Specific source person / institution", "具体来源人员／机构")}
        <select name="customerSourceNodeId">
          <option value="">
            {t("Not linked / pending review", "暂不关联／待核对")}
          </option>
          {nodes
            .filter((n) => !n.archived && n.kind !== "ROOT")
            .map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
        </select>
      </label>
      <select
        name="customerSourceMeaning"
        aria-label={t("Source meaning", "来源关系含义")}
        defaultValue="CONTACT"
      >
        <option value="CONTACT">{t("Contact only", "一般联系")}</option>
        <option value="REFERRAL">{t("Referral", "介绍来源")}</option>
        <option value="SCHOOL">{t("School connection", "学校联系")}</option>
      </select>
      <label>
        <input name="customerSourceConfirmed" type="checkbox" />
        {t("I verified this source connection", "我已核对该来源关系")}
      </label>
      <textarea
        name="customerReviewNote"
        rows={2}
        placeholder={t(
          "Identity / guardian / source verification basis",
          "身份、监护关系、来源的核对依据",
        )}
      />
      <details>
        <summary>
          {t("Same name, different person?", "同名但确为不同学生？")}
        </summary>
        <textarea
          name="distinctIdentityNote"
          rows={2}
          placeholder={t(
            "Only for a verified different identity; explain at least 20 characters",
            "仅用于已核实为不同身份的情况，至少20字说明",
          )}
        />
      </details>
      <small style={{ color: "#708077", lineHeight: 1.8 }}>
        {t(
          "Name matching does not merge profiles. Confirmed selections create the map links in the same transaction; uncertain information stays pending. Guardian and actual payer remain separate.",
          "不按姓名自动合并。确认的选择随学生录入同一事务建立关联，未确认信息保留待核对；监护人和实际付款人分开。",
        )}
      </small>
    </fieldset>
  );
}
