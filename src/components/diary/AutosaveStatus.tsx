type AutosaveStatusProps = {
  status: "saved" | "dirty" | "saving" | "failed";
  lastSavedAt: Date | null;
};

export function AutosaveStatus({ status, lastSavedAt }: AutosaveStatusProps) {
  if (status === "saving") return <span className="badge">保存中</span>;
  if (status === "dirty") return <span className="badge">有未保存改动</span>;
  if (status === "failed") return <span className="badge">保存失败，等待重试</span>;
  return <span className="badge">{lastSavedAt ? `已保存于 ${lastSavedAt.toLocaleTimeString()}` : "已保存"}</span>;
}
