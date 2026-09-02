
interface PreloaderProps {
  label?: string;
}

export function Preloader({ label = "Loading SurgeLab Navigation..." }: PreloaderProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl transition-opacity duration-200 select-none"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3.5 animate-fade-in">
        {/* Apple iOS-style activity spinner */}
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-slate-200/80" />
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-sky-500 border-r-sky-500" />
        </div>
        <p className="text-xs font-semibold tracking-tight text-slate-500">
          {label}
        </p>
      </div>
    </div>
  );
}

export default Preloader;

