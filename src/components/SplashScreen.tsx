export function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black animate-splash-exit"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-6 sm:gap-8">
        <div className="flex items-center justify-center gap-3 sm:gap-7">
          <img
            className="h-11 w-11 animate-splash-icon object-contain sm:h-[76px] sm:w-[76px]"
            src="/logo/visual_logo.png"
            alt=""
            width={76}
            height={76}
            decoding="async"
          />
          <img
            className="h-auto w-[110px] animate-splash-wordmark sm:w-[240px]"
            src="/logo/SurgeLab.svg"
            alt="SurgeLab"
            width={240}
            height={52}
            decoding="async"
          />
        </div>
        <div className="splash-line h-px w-0 max-w-[280px] animate-splash-line bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      </div>
    </div>
  );
}
