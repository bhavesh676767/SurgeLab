export function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-white animate-splash-exit select-none"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="flex items-center justify-center gap-3.5">
          <img
            className="h-12 w-12 animate-splash-icon object-contain sm:h-16 sm:w-16"
            src="/logo/visual_logo.png"
            alt=""
            width={64}
            height={64}
            decoding="async"
          />
          <img
            className="h-auto w-[120px] animate-splash-wordmark sm:w-[160px]"
            src="/logo/SurgeLab.svg"
            alt="SurgeLab"
            width={160}
            height={36}
            decoding="async"
          />
        </div>
        <div className="splash-line h-0.5 w-0 max-w-[160px] animate-splash-line bg-gradient-to-r from-transparent via-sky-500/60 to-transparent rounded-full" />
      </div>
    </div>
  );
}

