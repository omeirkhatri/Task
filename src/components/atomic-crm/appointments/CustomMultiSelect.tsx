import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type MultiSelectOption = {
  value: string;
  label: string;
  color?: string;
  icon?: React.ReactNode;
};

type CustomMultiSelectProps = {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  className?: string;
};

export const CustomMultiSelect: React.FC<CustomMultiSelectProps> = ({
  options,
  selected,
  onChange,
  placeholder,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectAll = () => {
    if (!options || !Array.isArray(options)) return;
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.value));
    }
  };

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const getDisplayText = () => {
    if (!options || !Array.isArray(options) || selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const option = options.find((opt) => opt.value === selected[0]);
      return option?.label || placeholder;
    }
    if (selected.length === options.length) {
      return `All ${placeholder}`;
    }
    return `${selected.length} selected`;
  };

  const getVisibleIndicators = () => {
    if (!options || !Array.isArray(options) || selected.length === 0) return [];
    const selectedOptions = options.filter((opt) => selected.includes(opt.value));
    return selectedOptions.slice(0, 2);
  };

  const visibleIndicators = getVisibleIndicators();
  const remainingCount = (selected?.length || 0) - visibleIndicators.length;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-3 py-2 text-left bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm justify-between transition-colors",
          isOpen && "border-blue-500 dark:border-blue-400",
          className
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {visibleIndicators.length > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {visibleIndicators.map((opt) => (
                <div
                  key={opt.value}
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: opt.color || "#6b7280" }}
                />
              ))}
              {remainingCount > 0 && (
                <span className="text-xs text-[--muted-foreground]">+{remainingCount}</span>
              )}
            </div>
          )}
          <span className={cn(
            "truncate text-slate-700 dark:text-slate-200",
            visibleIndicators.length > 0 && "ml-2"
          )}>
            {getDisplayText()}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0 transition-all",
            isOpen && "transform rotate-180 text-blue-600 dark:text-blue-400"
          )}
        />
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden">
          <button
            type="button"
            onClick={handleSelectAll}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-slate-700 text-left border-b border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Check
              className={cn(
                "w-4 h-4 flex-shrink-0",
                options && Array.isArray(options) && selected.length === options.length
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-400 dark:text-slate-500"
              )}
            />
            <span className="text-slate-700 dark:text-slate-200 font-medium">Select All</span>
          </button>
          <div className="max-h-60 overflow-y-auto">
            {(options || []).map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggle(option.value)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors",
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  )}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {option.color && (
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 border border-slate-200 dark:border-slate-600"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    {option.icon && <span className="flex-shrink-0 text-slate-600 dark:text-slate-300">{option.icon}</span>}
                    <span className={cn(
                      "flex-1 text-slate-700 dark:text-slate-200",
                      isSelected && "font-medium"
                    )}>
                      {option.label}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};


