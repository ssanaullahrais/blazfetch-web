/** The one concise error body shared by every download trigger. The useful
 * reason is shown directly; users should not have to leave the page or open
 * admin logs to understand a failure. */
export function ErrorToast({ title, message, calm = false }: { title: string; message: string; calm?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={calm ? "font-medium" : "font-medium text-destructive"}>{title}</span>
      <span className="text-xs text-muted-foreground">{message}</span>
    </div>
  );
}
