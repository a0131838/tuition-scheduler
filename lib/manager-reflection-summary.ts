export type ReflectionChecklistItem<K extends string = string> = {
  key: K;
  en: string;
  zh: string;
};

export type ReflectionHistoryEntry<K extends string = string> = {
  checklist: Record<K, boolean>;
};

export function summarizeManagerReflectionHistory<K extends string>(
  entries: Array<ReflectionHistoryEntry<K>>,
  checklistItems: Array<ReflectionChecklistItem<K>>,
) {
  const completedEntries = entries.filter((entry) => checklistItems.every((item) => Boolean(entry.checklist[item.key]))).length;
  const checklistItemsTotal = entries.length * checklistItems.length;
  const checklistItemsDone = entries.reduce(
    (sum, entry) => sum + checklistItems.filter((item) => Boolean(entry.checklist[item.key])).length,
    0,
  );
  const itemStats = checklistItems.map((item) => {
    const done = entries.filter((entry) => Boolean(entry.checklist[item.key])).length;
    return {
      ...item,
      done,
      total: entries.length,
      rate: entries.length ? Math.round((done / entries.length) * 100) : 0,
    };
  });
  return {
    logDays: entries.length,
    completedLogDays: completedEntries,
    completionRate: entries.length ? Math.round((completedEntries / entries.length) * 100) : 0,
    checklistItemsDone,
    checklistItemsTotal,
    checklistCompletionRate: checklistItemsTotal ? Math.round((checklistItemsDone / checklistItemsTotal) * 100) : 0,
    itemStats,
  };
}
