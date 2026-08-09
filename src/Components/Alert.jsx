const TONES = {
  error: { box: "border-red-200 bg-red-50 text-red-800", role: "alert" },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-900", role: "status" },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-800", role: "status" },
  info: { box: "border-slate-200 bg-slate-50 text-slate-700", role: "status" },
};

const Alert = ({ tone = "info", title, children, action }) => {
  const { box, role } = TONES[tone] ?? TONES.info;

  return (
    <div
      className={`animate-fade-up rounded-xl border px-4 py-3 text-sm ${box}`}
      role={role}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className={title ? "mt-0.5 opacity-90" : ""}>{children}</div>}
        </div>
        {action}
      </div>
    </div>
  );
};

export default Alert;
