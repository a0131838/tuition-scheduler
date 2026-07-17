function parentStatus(level, canViewReports) {
  if (canViewReports === false) {
    return {
      label: "服务进行中",
      summary: "这里会显示你已获授权的课程和服务信息。",
      tone: "stable"
    };
  }
  if (level === "HIGH" || level === "高风险") {
    return {
      label: "正在重点跟进",
      summary: "服务团队已进入重点处理，并会持续更新进展。",
      tone: "attention"
    };
  }
  if (level === "MEDIUM" || level === "中风险") {
    return {
      label: "需要关注",
      summary: "服务团队正在跟进当前关注事项和下一步。",
      tone: "watch"
    };
  }
  return {
    label: "进展稳定",
    summary: "当前服务按计划推进，暂无需要家长紧急处理的事项。",
    tone: "stable"
  };
}

function lessonBalance(minutes) {
  const total = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  if (!total) return "暂无剩余课时";
  if (!remainder) return `${hours} 小时`;
  if (!hours) return `${remainder} 分钟`;
  return `${hours} 小时 ${remainder} 分钟`;
}

module.exports = { parentStatus, lessonBalance };
