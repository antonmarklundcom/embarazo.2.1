// B4: groups the growing settings list into labeled sections (cuenta ·
// bebé · embarazo · notificaciones · privacidad · datos) instead of one
// long flat list. A group with no content today (bebé, notificaciones —
// nothing to show until B2/B5 land) simply isn't rendered rather than
// showing an empty header; future tasks that add content there should wrap
// it in <SettingsGroup title="Bebé"> / "Notificaciones" alongside these.
export function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="px-1 text-[11px] font-extrabold uppercase tracking-[1.6px] text-petrol">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
