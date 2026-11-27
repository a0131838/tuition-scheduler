// Signed-off hours from the family settlement statements. Reporting only.
// Each balance covers movements through the named ledger row; later book postings
// already represented on the statement are excluded exactly once by their IDs.
export type SettlementStatement = {
  reference: string;
  effectiveDate: string;
  throughTxn: string;
  remainingMinutes: number;
  includedPostingIds: string[];
};
export const settlementStatements: Record<string, SettlementStatement[]> = {
  "0569cb47-eb72-41b4-8676-358e41479701": [
    {
      reference: "2026-07-23 / 150h",
      effectiveDate: "2026-07-23",
      throughTxn: "6d9b68b0-a42d-4d0e-8010-79f812f679c8",
      remainingMinutes: 1575,
      includedPostingIds: [],
    },
    {
      reference: "2026-10-01 / balance settlement",
      effectiveDate: "2026-10-01",
      throughTxn: "29a9f8de-5adf-4aff-b1d9-8f0a4cea8228",
      remainingMinutes: -2475,
      includedPostingIds: [],
    },
    {
      reference: "2026-10-02 / 100h + 6h",
      effectiveDate: "2026-10-02",
      throughTxn: "29a9f8de-5adf-4aff-b1d9-8f0a4cea8228",
      remainingMinutes: 3885,
      includedPostingIds: ["b2a4edd3-11c8-4594-9c4b-0e05d391e331", "47412bdd-3e04-48e6-97a1-05e14d9bcbf8"],
    },
  ],
};
