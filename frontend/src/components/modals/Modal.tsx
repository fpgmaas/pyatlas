import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "full";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Memoize onClose to use in effect
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, handleClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus the dialog
      dialogRef.current?.focus();
    } else if (previousActiveElement.current) {
      // Return focus when closing
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: "max-w-sm",
    md: "max-w-xl",
    lg: "max-w-3xl",
    full: "w-full h-full m-0 rounded-none",
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onMouseDown={handleClose}
      aria-hidden="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`relative z-[70] w-full ${sizeClasses[size]} mx-4 rounded-2xl
                    border border-gray-600/50 bg-gray-900/95 backdrop-blur-md shadow-xl
                    focus:outline-none
                    animate-[modal-in_150ms_ease-out]`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700/60 px-4 py-3">
          <h2 id="modal-title" className="text-sm font-semibold text-gray-100">
            {title}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-800
                       hover:text-gray-100 focus:outline-none focus:ring-2
                       focus:ring-indigo-500 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
