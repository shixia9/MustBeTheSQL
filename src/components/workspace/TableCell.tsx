import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize2 } from 'lucide-react';

interface TableCellProps {
  value: any;
  maxWidth?: number;
}

export default function TableCell({ value, maxWidth = 200 }: TableCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const stringValue = value === null ? 'null' : String(value);
  const isNull = value === null;

  useEffect(() => {
    if (cellRef.current) {
      setIsTruncated(cellRef.current.scrollWidth > cellRef.current.clientWidth);
    }
  }, [stringValue, maxWidth]);

  return (
    <>
      <div 
        className="relative group flex items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div 
          ref={cellRef}
          className={`truncate font-sans text-[13px] leading-relaxed transition-colors duration-200 ${isNull ? 'italic text-on-surface-variant/50' : 'text-on-surface-variant group-hover:text-on-surface'}`}
          style={{ maxWidth: `${maxWidth}px` }}
        >
          {stringValue}
        </div>
        
        {isTruncated && isHovered && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            className="absolute right-0 bg-surface-container-highest p-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-primary/10 hover:text-primary"
            title="Expand Content"
          >
            <Maximize2 size={12} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-on-surface/20 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-surface rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/20 flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-lowest">
                <h3 className="text-sm font-bold text-on-surface font-headline tracking-wide uppercase">Cell Content</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-md text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar bg-surface-container-lowest">
                <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-on-surface-variant bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                  {stringValue}
                </pre>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
