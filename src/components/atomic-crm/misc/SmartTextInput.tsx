import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGetList } from "ra-core";
import { Calendar, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  extractMentions,
  findCurrentMention,
  parseDateFromText,
} from "./textParsing";
import { crmDateInputString } from "./timezone";
import type { Sale } from "../types";

export type SmartTextInputProps = {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  rows?: number;
  onDateDetected?: (date: string) => void;
  onUsersTagged?: (userIds: number[]) => void;
} & React.ComponentProps<"textarea"> &
  React.ComponentProps<"input">;

/**
 * SmartTextInput
 * - @mention autocomplete (tagging)
 * - date detection + optional “insert date” suggestion
 *
 * IMPORTANT: This component intentionally uses a plain, controlled input/textarea
 * (no overlay rendering / no caret hacks) to keep cursor behavior stable.
 */
export const SmartTextInput = React.forwardRef<
  HTMLTextAreaElement | HTMLInputElement,
  SmartTextInputProps
>((props, ref) => {
  const {
    value = "",
    onChange,
    multiline = false,
    placeholder,
    className,
    inputClassName,
    rows,
    onDateDetected,
    onUsersTagged,
    ...rest
  } = props;

  const [cursorPosition, setCursorPosition] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionType, setSuggestionType] = useState<"date" | "mention" | null>(null);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const setRefs = useCallback(
    (node: HTMLTextAreaElement | HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<
          HTMLTextAreaElement | HTMLInputElement | null
        >).current = node;
      }
    },
    [ref],
  );

  // Users list for mention autocomplete
  const { data: salesData, isLoading: isLoadingSales, error: salesError } =
    useGetList<Sale>("sales", {
      pagination: { page: 1, perPage: 100 },
      sort: { field: "last_name", order: "ASC" },
    });

  const sales = useMemo(() => {
    const all = salesData || [];
    return all.filter((s) => !s.disabled);
  }, [salesData]);

  const filteredSales = useMemo(() => {
    if (suggestionType !== "mention") return [];
    const q = suggestionQuery.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((sale) => {
      const full = `${sale.first_name || ""} ${sale.last_name || ""}`.trim();
      return (
        sale.first_name?.toLowerCase().includes(q) ||
        sale.last_name?.toLowerCase().includes(q) ||
        full.toLowerCase().includes(q) ||
        sale.email?.toLowerCase().includes(q)
      );
    });
  }, [sales, suggestionQuery, suggestionType]);

  useEffect(() => {
    if (suggestionType === "mention" && filteredSales.length > 0) {
      setSelectedIndex((prev) => Math.min(prev, filteredSales.length - 1));
    }
  }, [filteredSales.length, suggestionType]);

  const updateCursorFromElement = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const pos = (el as HTMLTextAreaElement | HTMLInputElement).selectionStart ?? 0;
    setCursorPosition(pos);
  }, []);

  const findMostRecentDatePattern = useCallback(
    (text: string, cursorPos: number): { matchedText: string; date: string } | null => {
      if (!text || !text.trim()) return null;

      const datePatterns = [
        {
          pattern: /\b(day\s+after\s+tomorrow|day\s+after\s+tmrw)\b/gi,
          parse: (match: string) => parseDateFromText(match),
        },
        {
          pattern: /\b(next\s+week|next\s+month)\b/gi,
          parse: (match: string) => parseDateFromText(match),
        },
        {
          pattern: /\b(in\s+\d+\s+days?|\d+\s+days?\s+from\s+now)\b/gi,
          parse: (match: string) => parseDateFromText(match),
        },
        {
          pattern: /\b(today|tomorrow)\b/gi,
          parse: (match: string) => parseDateFromText(match),
        },
      ];

      const textBeforeCursor = text.substring(0, cursorPos);

      let closest: { matchedText: string; date: string; endPos: number } | null =
        null;

      for (const { pattern, parse } of datePatterns) {
        const matches = Array.from(textBeforeCursor.matchAll(pattern));
        for (const match of matches) {
          const start = match.index!;
          const end = start + match[0].length;
          const matchedText = match[0];

          const charAfter = textBeforeCursor[end];
          const isAtWordBoundary = !charAfter || /[\s\n.,!?;:]/.test(charAfter);
          if (!isAtWordBoundary) continue;

          const parsedDate = parse(matchedText);
          if (!parsedDate) continue;

          if (!closest || end > closest.endPos) {
            closest = { matchedText, date: parsedDate, endPos: end };
          }
        }
      }

      return closest ? { matchedText: closest.matchedText, date: closest.date } : null;
    },
    [],
  );

  // Debounced date detection (doesn't change the text, only notifies)
  useEffect(() => {
    if (!onDateDetected) return;
    if (!value || !value.trim()) return;

    const timeout = setTimeout(() => {
      const datePattern = findMostRecentDatePattern(value, cursorPosition);
      if (datePattern) onDateDetected(datePattern.date);
    }, 120);

    return () => clearTimeout(timeout);
  }, [cursorPosition, findMostRecentDatePattern, onDateDetected, value]);

  // Suggestions: mentions or date
  useEffect(() => {
    if (!value) {
      setShowSuggestions(false);
      setSuggestionType(null);
      setSelectedIndex(0);
      return;
    }

    // Mention suggestion
    const mentionInfo = findCurrentMention(value, cursorPosition);
    if (mentionInfo) {
      setSuggestionType("mention");
      setSuggestionQuery(mentionInfo.query);
      setShowSuggestions(true);
      setSelectedIndex(0);
      return;
    }

    // Date suggestion near cursor
    const textBeforeCursor = value.substring(
      Math.max(0, cursorPosition - 30),
      cursorPosition,
    );
    const trimmedText = textBeforeCursor.trim();

    const datePatterns = [
      /(today|tomorrow|day\s+after\s+tomorrow|day\s+after\s+tmrw|next\s+week|next\s+month|in\s+\d+\s+days?|\d+\s+days?\s+from\s+now)$/i,
      /(today|tomorrow)\s+at\s+\d{1,2}:?(\d{2})?\s*(am|pm)?$/i,
      /\d{1,2}\/\d{1,2}(\/\d{4})?$/,
      /\d{4}-\d{2}-\d{2}$/,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(\s+\d{4})?$/i,
      /\d{1,2}:?\d{2}?\s*(am|pm)?$/i,
    ];

    const hasDatePattern = datePatterns.some((p) => p.test(trimmedText));
    if (hasDatePattern) {
      const parsed = parseDateFromText(trimmedText);
      if (parsed) {
        setSuggestionType("date");
        setSuggestionQuery(trimmedText);
        setShowSuggestions(true);
        setSelectedIndex(0);
        return;
      }
    }

    setShowSuggestions(false);
    setSuggestionType(null);
    setSelectedIndex(0);
  }, [cursorPosition, value]);

  const emitTaggedUsers = useCallback(
    (text: string) => {
      if (!onUsersTagged) return;
      const taggedUsers = extractMentions(text)
        .map((mention) => {
          const matchedSale = sales.find(
            (s) =>
              `${s.first_name} ${s.last_name}`.toLowerCase() ===
                mention.toLowerCase() ||
              s.first_name?.toLowerCase() === mention.toLowerCase() ||
              s.last_name?.toLowerCase() === mention.toLowerCase(),
          );
          return matchedSale?.id;
        })
        .filter((id): id is number => id !== undefined);

      onUsersTagged(taggedUsers);
    },
    [onUsersTagged, sales],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const next = e.target.value;
      const nextCursor = e.target.selectionStart ?? 0;

      setCursorPosition(nextCursor);
      onChange(next);
      emitTaggedUsers(next);

      // If the parent re-renders and selection is lost, we restore it next frame.
      // This is minimal and only uses the browser’s current cursor position.
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        if (document.activeElement !== el) return;
        try {
          (el as HTMLTextAreaElement | HTMLInputElement).setSelectionRange(
            nextCursor,
            nextCursor,
          );
        } catch {
          // ignore
        }
      });
    },
    [emitTaggedUsers, onChange],
  );

  const insertMention = useCallback(
    (sale: Sale) => {
      const mentionInfo = findCurrentMention(value, cursorPosition);
      if (!mentionInfo) return;

      const mentionText = `@${sale.first_name} ${sale.last_name}`;
      const before = value.substring(0, mentionInfo.start);
      const after = value.substring(cursorPosition);
      const next = `${before}${mentionText} ${after}`;
      const nextCursor = before.length + mentionText.length + 1;

      onChange(next);
      emitTaggedUsers(next);
      setShowSuggestions(false);
      setSelectedIndex(0);
      setCursorPosition(nextCursor);

      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        (el as HTMLTextAreaElement | HTMLInputElement).focus();
        try {
          (el as HTMLTextAreaElement | HTMLInputElement).setSelectionRange(
            nextCursor,
            nextCursor,
          );
        } catch {
          // ignore
        }
      });
    },
    [cursorPosition, emitTaggedUsers, onChange, value],
  );

  const insertDateSuggestion = useCallback(() => {
    if (!suggestionQuery) return;

    const parsedDate = parseDateFromText(suggestionQuery);
    if (!parsedDate) return;

    const dateStr = crmDateInputString(new Date(parsedDate));

    const textBeforeCursor = value.substring(
      Math.max(0, cursorPosition - 30),
      cursorPosition,
    );
    const trimmedBefore = textBeforeCursor.trim();

    const datePatterns = [
      /^(today|tomorrow|next\s+week|in\s+\d+\s+days?|\d+\s+days?\s+from\s+now)$/i,
      /^(today|tomorrow)\s+at\s+\d{1,2}:?(\d{2})?\s*(am|pm)?$/i,
      /^\d{1,2}\/\d{1,2}(\/\d{4})?$/,
      /^\d{4}-\d{2}-\d{2}$/,
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(\s+\d{4})?$/i,
      /^\d{1,2}:?\d{2}?\s*(am|pm)?$/i,
    ];

    // Replace either the full trimmed chunk (if it matches) or the last word
    const matchesPattern = datePatterns.some((p) => p.test(trimmedBefore));

    let replaceStart = cursorPosition;
    if (matchesPattern && trimmedBefore.length > 0) {
      replaceStart = Math.max(0, cursorPosition - trimmedBefore.length);
    } else {
      const words = trimmedBefore.split(/\s+/);
      const lastWord = words[words.length - 1] || "";
      replaceStart = Math.max(0, cursorPosition - lastWord.length);
    }

    const before = value.substring(0, replaceStart);
    const after = value.substring(cursorPosition);
    const next = `${before}${dateStr} ${after}`;
    const nextCursor = before.length + dateStr.length + 1;

    onChange(next);
    setShowSuggestions(false);
    setCursorPosition(nextCursor);
    onDateDetected?.(parsedDate);

    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      (el as HTMLTextAreaElement | HTMLInputElement).focus();
      try {
        (el as HTMLTextAreaElement | HTMLInputElement).setSelectionRange(
          nextCursor,
          nextCursor,
        );
      } catch {
        // ignore
      }
    });
  }, [cursorPosition, onChange, onDateDetected, suggestionQuery, value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (!showSuggestions) return;

      if (suggestionType === "mention") {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, Math.max(0, filteredSales.length - 1)),
          );
          return;
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          return;
        }

        if (e.key === "Enter") {
          e.preventDefault();
          const sale = filteredSales[selectedIndex];
          if (sale) insertMention(sale);
          return;
        }

        if (e.key === "Escape") {
          e.preventDefault();
          setShowSuggestions(false);
          setSelectedIndex(0);
          return;
        }
      }

      if (suggestionType === "date" && e.key === "Enter") {
        e.preventDefault();
        insertDateSuggestion();
      }
    },
    [
      filteredSales,
      insertDateSuggestion,
      insertMention,
      selectedIndex,
      showSuggestions,
      suggestionType,
    ],
  );

  const handleSelect = useCallback(() => {
    updateCursorFromElement();
  }, [updateCursorFromElement]);

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      // One last date detect on blur
      if (onDateDetected && value) {
        const pos = e.target.selectionStart ?? value.length;
        const datePattern = findMostRecentDatePattern(value, pos);
        if (datePattern) onDateDetected(datePattern.date);
      }

      if (rest.onBlur) {
        rest.onBlur(e as any);
      }
    },
    [findMostRecentDatePattern, onDateDetected, rest, value],
  );

  const InputComponent = multiline ? Textarea : Input;

  return (
    <div className={cn("relative", className)}>
      <InputComponent
        {...(rest as any)}
        ref={setRefs as any}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect as any}
        onKeyUp={handleSelect as any}
        onClick={handleSelect as any}
        onBlur={handleBlur as any}
        placeholder={placeholder}
        className={cn(inputClassName, multiline && "px-3 py-2")}
        rows={multiline ? rows : undefined}
      />

      {showSuggestions && (
        <div className="absolute top-full z-20 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md">
          {suggestionType === "mention" && (
            <Command>
              <CommandList>
                {isLoadingSales ? (
                  <CommandEmpty>Loading users...</CommandEmpty>
                ) : filteredSales.length > 0 ? (
                  <CommandGroup>
                    {filteredSales.map((sale, index) => (
                      <CommandItem
                        key={sale.id}
                        onSelect={() => insertMention(sale)}
                        data-selected={index === selectedIndex}
                        className={cn(
                          "cursor-pointer",
                          index === selectedIndex &&
                            "bg-accent text-accent-foreground",
                        )}
                      >
                        <User className="mr-2 h-4 w-4" />
                        <span>
                          {sale.first_name} {sale.last_name}
                        </span>
                        {sale.email && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {sale.email}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : sales.length === 0 ? (
                  <CommandEmpty>
                    {salesError ? "Error loading users" : "No users available"}
                  </CommandEmpty>
                ) : (
                  <CommandEmpty>
                    No users found matching &quot;{suggestionQuery}&quot;
                  </CommandEmpty>
                )}
              </CommandList>
            </Command>
          )}

          {suggestionType === "date" && (
            <Command>
              <CommandList>
                <CommandGroup>
                  <CommandItem onSelect={insertDateSuggestion} className="cursor-pointer">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>
                      Add date:{" "}
                      {crmDateInputString(
                        new Date(parseDateFromText(suggestionQuery) || new Date()),
                      )}
                    </span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </div>
      )}
    </div>
  );
});

SmartTextInput.displayName = "SmartTextInput";
