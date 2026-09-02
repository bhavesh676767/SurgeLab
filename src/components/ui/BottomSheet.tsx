import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showHandle?: boolean;
  showBackdrop?: boolean;
  onSnapDown?: () => void;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  showHandle = true,
  showBackdrop = true,
  onSnapDown,
  className = '',
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const currentTranslateY = useRef<number>(0);

  // Keyboard: Escape closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll when open (only if backdrop is enabled)
  useEffect(() => {
    if (isOpen && showBackdrop) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, showBackdrop]);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    currentTranslateY.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (dragStartY.current === null || !sheetRef.current) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - dragStartY.current;
    if (deltaY > 0) {
      currentTranslateY.current = deltaY;
      sheetRef.current.style.transform = `translateY(${deltaY * 0.75}px)`;
      sheetRef.current.style.transition = 'none';
    }
  };

  const handleTouchEnd = () => {
    if (dragStartY.current === null || !sheetRef.current) return;
    const delta = currentTranslateY.current;
    sheetRef.current.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

    if (delta > 60) {
      // Trigger snap down or close
      sheetRef.current.style.transform = '';
      if (onSnapDown) {
        onSnapDown();
      } else {
        onClose();
      }
    } else {
      // Snap back to 0
      sheetRef.current.style.transform = 'translateY(0px)';
    }
    dragStartY.current = null;
    currentTranslateY.current = 0;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Optional Backdrop */}
      {showBackdrop && (
        <div
          className="fixed inset-0 z-[1999] bg-slate-900/40 backdrop-blur-[2px]"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Panel'}
        className={[
          'fixed bottom-0 left-0 right-0 z-[2000]',
          'mx-auto max-w-lg',
          'bg-white rounded-t-[32px] shadow-sheet',
          'max-h-[92dvh] flex flex-col',
          'sheet-enter transition-all duration-300',
          className,
        ].join(' ')}
      >
        {/* Interactive Handle area with slide down gesture */}
        <div
          className="flex-none px-4 pt-3 pb-2 cursor-grab active:cursor-grabbing select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
        >
          {showHandle && (
            <div
              onClick={() => {
                if (onSnapDown) onSnapDown();
                else onClose();
              }}
              title="Drag or tap to slide down"
              className="group mx-auto mb-2 flex h-5 w-16 items-center justify-center cursor-pointer"
            >
              <div className="h-1.5 w-12 rounded-full bg-slate-300 group-hover:bg-slate-400 group-hover:w-14 transition-all" />
            </div>
          )}
          {title && (
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8">
          {children}
        </div>
      </div>
    </>
  );
}
