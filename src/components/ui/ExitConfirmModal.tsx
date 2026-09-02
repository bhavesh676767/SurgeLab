import { AlertTriangle, X } from "lucide-react";

interface ExitConfirmModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExitConfirmModal({
  isOpen,
  title = "End Route Guidance?",
  description = "This will clear your current safe corridor and return to the map search.",
  onConfirm,
  onCancel,
}: ExitConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs fade-in select-none">
      <div
        className="w-full max-w-xs rounded-2xl bg-white border border-slate-200/90 p-4 shadow-xl space-y-3 select-none slide-up"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex-shrink-0">
              <AlertTriangle className="h-3.5 w-3.5 text-slate-700" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 font-normal leading-relaxed">
          {description}
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 py-2.5 text-xs font-bold text-slate-700 transition"
          >
            Keep Route
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-xl bg-slate-900 hover:bg-black active:scale-95 py-2.5 text-xs font-bold text-white transition shadow-xs"
          >
            End Route
          </button>
        </div>
      </div>
    </div>
  );
}

