import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={`relative card w-full ${sizes[size]} max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl`}
      >
        <div className="sticky top-0 bg-night-900/95 backdrop-blur-sm flex items-center justify-between px-6 py-4 border-b border-night-800 z-10">
          <h3 className="font-display font-semibold text-lg text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-night-400 hover:bg-night-800 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
