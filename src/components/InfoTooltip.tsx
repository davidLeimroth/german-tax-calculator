import { useState, useRef, useEffect } from 'react';

interface InfoTooltipProps {
  text: string;
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-base-content/40 hover:text-base-content/70 hover:bg-base-200 transition-colors text-xs font-bold"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Info"
        aria-expanded={open}
      >
        ?
      </button>
      {open && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-base-100 shadow-lg rounded-lg px-4 py-3 text-sm text-base-content/80 border border-base-300">
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-base-100 border-l border-t border-base-300" />
          {text}
        </div>
      )}
    </div>
  );
}
