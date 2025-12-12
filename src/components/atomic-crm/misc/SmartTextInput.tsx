import * as React from "react";
import { useRef, useState, useEffect, useCallback } from "react";
import { useGetList } from "ra-core";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseDateFromText, findCurrentMention, extractMentions, findAutoExtractDatePattern } from "./textParsing";
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
 * SmartTextInput component that provides:
 * 1. Date/time auto-suggestions (like Apple Reminders)
 * 2. @mention autocomplete for tagging users
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
  const textareaRef = useRef<HTMLTextAreaElement | HTMLInputElement | HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const lastProcessedValueRef = useRef<string>("");
  const isUpdatingRef = useRef<boolean>(false);

  // Get list of sales/users for @mention autocomplete
  // Fetch all sales and filter disabled ones client-side to avoid filter syntax issues
  const { data: salesData, isLoading: isLoadingSales, error: salesError } = useGetList<Sale>("sales", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "last_name", order: "ASC" },
  });

  // Filter out disabled users client-side
  // Note: useGetList returns { data: T[], total: number }, so salesData is the array
  const sales = React.useMemo(() => {
    const allSales = salesData || [];
    return allSales.filter((sale) => !sale.disabled);
  }, [salesData]);

  // Combine refs
  const combinedRef = useCallback(
    (node: HTMLTextAreaElement | HTMLInputElement | null) => {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLTextAreaElement | HTMLInputElement | null>).current = node;
      }
      (textareaRef as React.MutableRefObject<HTMLTextAreaElement | HTMLInputElement | null>).current = node;
    },
    [ref],
  );

  // Filter sales based on mention query
  // When query is empty (just typed @), show all users
  // When query has text, filter by name/email
  const filteredSales = React.useMemo(() => {
    if (suggestionType !== "mention") return [];
    if (!suggestionQuery || suggestionQuery.trim() === "") return sales;
    
    const query = suggestionQuery.toLowerCase().trim();
    return sales.filter(
      (sale) =>
        sale.first_name?.toLowerCase().includes(query) ||
        sale.last_name?.toLowerCase().includes(query) ||
        `${sale.first_name} ${sale.last_name}`.toLowerCase().includes(query) ||
        sale.email?.toLowerCase().includes(query),
    );
  }, [sales, suggestionQuery, suggestionType]);

  // Reset selected index when filtered results change
  useEffect(() => {
    if (suggestionType === "mention" && filteredSales.length > 0) {
      setSelectedIndex((prevIndex) => {
        if (prevIndex >= filteredSales.length) {
          return Math.max(0, filteredSales.length - 1);
        }
        return prevIndex;
      });
    }
  }, [filteredSales.length, suggestionType]);


  // Detect date/time patterns and @mentions for suggestions
  useEffect(() => {
    if (!value || cursorPosition === 0) {
      setShowSuggestions(false);
      setSuggestionType(null);
      setSelectedIndex(0);
      return;
    }

    // Check for @mention
    const mentionInfo = findCurrentMention(value, cursorPosition);
    if (mentionInfo) {
      setSuggestionType("mention");
      setSuggestionQuery(mentionInfo.query);
      setShowSuggestions(true);
      setSelectedIndex(0); // Reset selection when query changes
      return;
    }

    // Check for date/time patterns near cursor
    // Look at the last 30 characters before cursor for date patterns
    const textBeforeCursor = value.substring(Math.max(0, cursorPosition - 30), cursorPosition);
    const trimmedText = textBeforeCursor.trim();
    
    // Only show date suggestions for specific date-like patterns
    // Note: "tomorrow", "day after tomorrow", "next week", "next month" are auto-extracted
    // and won't show suggestions - they're handled in handleInputChange
    const datePatterns = [
      /(today|tomorrow|day\s+after\s+tomorrow|day\s+after\s+tmrw|next\s+week|next\s+month|in\s+\d+\s+days?|\d+\s+days?\s+from\s+now)$/i,
      /(today|tomorrow)\s+at\s+\d{1,2}:?(\d{2})?\s*(am|pm)?$/i,
      /\d{1,2}\/\d{1,2}(\/\d{4})?$/,
      /\d{4}-\d{2}-\d{2}$/,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(\s+\d{4})?$/i,
      /\d{1,2}:?\d{2}?\s*(am|pm)?$/i,
    ];
    
    const hasDatePattern = datePatterns.some(pattern => pattern.test(trimmedText));
    
    if (hasDatePattern) {
      const dateMatch = parseDateFromText(trimmedText);
      if (dateMatch) {
        setSuggestionType("date");
        setSuggestionQuery(trimmedText);
        setShowSuggestions(true);
        setSelectedIndex(0); // Reset selection when query changes
        return;
      }
    }

    setShowSuggestions(false);
    setSuggestionType(null);
    setSelectedIndex(0);
  }, [value, cursorPosition]);


  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    // Check for auto-extract date patterns (tomorrow, next week, etc.)
    // Look for complete words/phrases that match date patterns anywhere in the text
    if (onDateDetected && newValue) {
      // Check if we just finished typing a word (space or end of text after a date pattern)
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const lastChar = textBeforeCursor[textBeforeCursor.length - 1];
      const isWordBoundary = lastChar === ' ' || lastChar === '\n' || cursorPos === newValue.length;
      
      if (isWordBoundary && textBeforeCursor.trim()) {
        // Check all text before cursor for date patterns
        // Look at the last few words to see if a date pattern was just completed
        const words = textBeforeCursor.trim().split(/\s+/);
        if (words.length > 0) {
          // Check last 1-3 words for date patterns (to catch "day after tomorrow")
          const lastWords = words.slice(-3);
          const lastPhrase = lastWords.join(' ');
          const datePattern = findAutoExtractDatePattern(lastPhrase);
          
          if (datePattern) {
            // Found a date pattern in the last words - search backwards from cursor to find it
            // Build regex with word boundaries to match the pattern (case-insensitive)
            const escapedPattern = datePattern.matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
            const patternRegex = new RegExp(`\\b${escapedPattern}\\b`, 'gi');
            
            // Find all matches in text before cursor
            const matches = Array.from(textBeforeCursor.matchAll(patternRegex));
            
            if (matches.length > 0) {
              // Use the last match (most recent/closest to cursor)
              const lastMatch = matches[matches.length - 1];
              const patternStart = lastMatch.index!;
              const patternEnd = patternStart + lastMatch[0].length;
              
              // Check if this match ends right before or at the cursor
              // When user types a space after the pattern, cursor is after space, pattern ends before space
              // So patternEnd should be cursorPos - 1 (before space) or cursorPos (if no space yet)
              const distanceFromCursor = cursorPos - patternEnd;
              if (distanceFromCursor >= 0 && distanceFromCursor <= 1) {
                // Don't remove the text - just notify about the detected date
                // The text will be highlighted via CSS or styling
                setTimeout(() => {
                  onDateDetected(datePattern.date);
                }, 0);
              }
            }
          }
        }
      }
    }
    
    onChange(newValue);
    
    // Update cursor position
    setCursorPosition(cursorPos);
    
    // Extract and notify about tagged users whenever text changes
    if (onUsersTagged) {
      const taggedUsers = extractMentions(newValue)
        .map((mention) => {
          const matchedSale = sales.find(
            (s) =>
              `${s.first_name} ${s.last_name}`.toLowerCase() === mention.toLowerCase() ||
              s.first_name?.toLowerCase() === mention.toLowerCase() ||
              s.last_name?.toLowerCase() === mention.toLowerCase(),
          );
          return matchedSale?.id;
        })
        .filter((id): id is number => id !== undefined);
      
      onUsersTagged(taggedUsers);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (showSuggestions && suggestionType === "mention") {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const maxIndex = filteredSales.length - 1;
          return prev < maxIndex ? prev + 1 : prev;
        });
        return;
      }
      
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }
      
      if (e.key === "Enter") {
        e.preventDefault();
        if (filteredSales.length > 0 && selectedIndex >= 0 && selectedIndex < filteredSales.length) {
          insertMention(filteredSales[selectedIndex]);
        }
        return;
      }
      
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(0);
        return;
      }
    }

    if (showSuggestions && suggestionType === "date" && e.key === "Enter") {
      e.preventDefault();
      insertDateSuggestion();
      return;
    }
  };

  // Helper function to set cursor position for both input/textarea and contentEditable div
  const setCursorPositionHelper = (element: HTMLInputElement | HTMLTextAreaElement | HTMLDivElement | null, position: number) => {
    if (!element) return;
    
    if (multiline && element instanceof HTMLDivElement) {
      // For contentEditable div, use Selection API
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let charCount = 0;
        let textNode: Node | null = null;
        let offset = 0;
        
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const nodeLength = node.textContent?.length || 0;
          if (charCount + nodeLength >= position) {
            textNode = node;
            offset = position - charCount;
            break;
          }
          charCount += nodeLength;
        }
        
        if (textNode) {
          const maxOffset = textNode.textContent?.length || 0;
          range.setStart(textNode, Math.min(offset, maxOffset));
          range.setEnd(textNode, Math.min(offset, maxOffset));
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.setSelectionRange(position, position);
    }
  };

  const insertDateSuggestion = () => {
    if (!suggestionQuery) return;
    
    const parsedDate = parseDateFromText(suggestionQuery);
    if (!parsedDate) return;

    const element = textareaRef.current;
    if (!element) return;

    const dateStr = crmDateInputString(new Date(parsedDate));
    
    // Find the start of the date pattern in the text before cursor
    const textBeforeCursor = value.substring(Math.max(0, cursorPosition - 30), cursorPosition);
    const trimmedBefore = textBeforeCursor.trim();
    
    // Find where the date pattern starts by looking backwards from cursor
    let dateStart = cursorPosition;
    const words = trimmedBefore.split(/\s+/);
    const lastWord = words[words.length - 1] || "";
    
    // Check if last word matches a date pattern
    const datePatterns = [
      /^(today|tomorrow|next\s+week|in\s+\d+\s+days?|\d+\s+days?\s+from\s+now)$/i,
      /^(today|tomorrow)\s+at\s+\d{1,2}:?(\d{2})?\s*(am|pm)?$/i,
      /^\d{1,2}\/\d{1,2}(\/\d{4})?$/,
      /^\d{4}-\d{2}-\d{2}$/,
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(\s+\d{4})?$/i,
      /^\d{1,2}:?\d{2}?\s*(am|pm)?$/i,
    ];
    
    const matchesPattern = datePatterns.some(pattern => pattern.test(trimmedBefore));
    
    if (matchesPattern) {
      // Replace the entire matched text
      dateStart = cursorPosition - trimmedBefore.length;
      if (dateStart < 0) dateStart = 0;
    } else {
      // Just replace the last word
      dateStart = cursorPosition - lastWord.length;
      if (dateStart < 0) dateStart = 0;
    }
    
    const before = value.substring(0, dateStart);
    const after = value.substring(cursorPosition);
    const newValue = `${before}${dateStr} ${after}`;
    
    onChange(newValue);
    
    // Move cursor after inserted date
    setTimeout(() => {
      const newPosition = before.length + dateStr.length + 1;
      setCursorPositionHelper(element, newPosition);
      setCursorPosition(newPosition);
    }, 0);

    setShowSuggestions(false);
    onDateDetected?.(parsedDate);
  };

  const insertMention = (sale: Sale) => {
    const element = textareaRef.current;
    if (!element) return;

    const mentionInfo = findCurrentMention(value, cursorPosition);
    if (!mentionInfo) return;

    const mentionText = `@${sale.first_name} ${sale.last_name}`;
    const before = value.substring(0, mentionInfo.start);
    const after = value.substring(cursorPosition);
    const newValue = `${before}${mentionText} ${after}`;
    
    onChange(newValue);
    
    // Move cursor after inserted mention
    setTimeout(() => {
      const newPosition = before.length + mentionText.length + 1;
      setCursorPositionHelper(element, newPosition);
      setCursorPosition(newPosition);
      setShowSuggestions(false);
      setSelectedIndex(0);
    }, 0);
  };

  // Function to find all date patterns in text and return their positions
  const findDatePatternsInText = (text: string): Array<{ start: number; end: number; text: string }> => {
    if (!text || !onDateDetected) return [];
    
    const patterns: Array<{ start: number; end: number; text: string }> = [];
    
    // Find all date patterns using regex (more reliable than word splitting)
    // Order matters: more specific patterns first to avoid partial matches
    const datePatterns = [
      /(day\s+after\s+tomorrow|day\s+after\s+tmrw)/gi,
      /(next\s+week|next\s+month)/gi,
      /(in\s+\d+\s+days?|\d+\s+days?\s+from\s+now)/gi,
      /\b(today|tomorrow)\b/gi,
    ];
    
    datePatterns.forEach(pattern => {
      const matches = Array.from(text.matchAll(pattern));
      matches.forEach(match => {
        const start = match.index!;
        const end = start + match[0].length;
        const matchedText = match[0];
        // Check if this pattern is followed by space, punctuation, or end of text
        const textAfter = text.substring(end);
        if (textAfter === '' || textAfter.match(/^[\s\n.,!?;:]/)) {
          // Avoid duplicates, overlapping matches, and adjacent identical matches
          // Check if this range overlaps with any existing pattern
          const hasOverlap = patterns.some(p => {
            // Check if ranges overlap: (start < p.end) && (end > p.start)
            // Also check if ranges are adjacent and contain the same text
            const isOverlapping = start < p.end && end > p.start;
            const isAdjacentSame = (start === p.end || end === p.start) && matchedText.toLowerCase() === p.text.toLowerCase();
            return isOverlapping || isAdjacentSame;
          });
          
          if (!hasOverlap) {
            patterns.push({ start, end, text: matchedText });
          }
        }
      });
    });
    
    // Sort by start position to ensure proper order
    return patterns.sort((a, b) => a.start - b.start);
  };

  // Function to find all @mentions in text and return their positions
  const findMentionsInText = (text: string): Array<{ start: number; end: number; text: string }> => {
    if (!text) return [];
    
    const mentions: Array<{ start: number; end: number; text: string }> = [];
    // Match @ followed by one or two words (first name and optionally last name)
    // Stop at the next space or end of string to prevent matching text after the mention
    const mentionRegex = /@(\w+(?:\s+\w+)?)(?=\s|$)/g;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      mentions.push({ start, end, text: match[0] });
    }
    
    return mentions;
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setCursorPosition((e.target as HTMLTextAreaElement | HTMLInputElement).selectionStart || 0);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement | HTMLDivElement>) => {
    // Check for date patterns when user finishes typing (on blur)
    // Don't remove text, just detect and notify
    if (onDateDetected && value) {
      const datePatterns = findDatePatternsInText(value);
      // Notify about the most recent date pattern found
      if (datePatterns.length > 0) {
        const lastPattern = datePatterns[datePatterns.length - 1];
        const phrase = value.substring(lastPattern.start, lastPattern.end);
        const datePattern = findAutoExtractDatePattern(phrase);
        if (datePattern) {
          onDateDetected(datePattern.date);
        }
      }
    }
    
    // Call original onBlur if provided
    if (rest.onBlur) {
      rest.onBlur(e as any);
    }
  };

  // For multiline, use textarea with overlay for highlighting
  // For single line, use regular input
  if (multiline) {
    const datePatterns = findDatePatternsInText(value);
    const mentions = findMentionsInText(value);
    
    // Combine and sort all highlights (date patterns and mentions)
    const allHighlights = [...datePatterns.map(p => ({ ...p, type: 'date' as const })), ...mentions.map(m => ({ ...m, type: 'mention' as const }))].sort((a, b) => a.start - b.start);
    
    return (
      <div className={cn("relative", className)}>
        <div className="relative">
          <Textarea
            {...rest}
            ref={combinedRef as any}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSelect={handleSelect}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={cn("relative z-10", inputClassName, "px-3 py-2")}
            rows={rows}
            style={{ 
              ...(rest.style || {}),
              color: 'transparent', 
              caretColor: 'var(--foreground)',
              paddingLeft: '0.75rem',
              paddingRight: '0.75rem',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem'
            }}
          />
          {value && (
            <div
              className="pointer-events-none absolute inset-0 z-0 overflow-hidden whitespace-pre-wrap break-words px-3 py-2 text-base md:text-sm"
              style={{
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit',
                paddingLeft: '0.75rem',
                paddingRight: '0.75rem',
                paddingTop: '0.5rem',
                paddingBottom: '0.5rem',
                border: 'transparent',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {allHighlights.length > 0 ? (
                (() => {
                  const parts: Array<{ text: string; type: 'date' | 'mention' | 'normal' }> = [];
                  let lastIndex = 0;
                  
                  allHighlights.forEach(highlight => {
                    if (highlight.start > lastIndex) {
                      parts.push({ text: value.substring(lastIndex, highlight.start), type: 'normal' });
                    }
                    parts.push({ text: value.substring(highlight.start, highlight.end), type: highlight.type });
                    lastIndex = highlight.end;
                  });
                  
                  if (lastIndex < value.length) {
                    parts.push({ text: value.substring(lastIndex), type: 'normal' });
                  }
                  
                  return parts.map((part, index) => {
                    if (part.type === 'date') {
                      return (
                        <span key={index} className="font-bold text-green-600 dark:text-green-400" style={{ color: 'rgb(22 163 74)' }}>
                          {part.text}
                        </span>
                      );
                    } else if (part.type === 'mention') {
                      return (
                        <span key={index} className="font-semibold text-blue-600 dark:text-blue-400" style={{ color: 'rgb(37 99 235)' }}>
                          {part.text}
                        </span>
                      );
                    } else {
                      return <span key={index} style={{ color: 'inherit', fontWeight: 'normal' }}>{part.text}</span>;
                    }
                  });
                })()
              ) : (
                <span>{value}</span>
              )}
            </div>
          )}
        </div>
        
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
                            index === selectedIndex && "bg-accent text-accent-foreground"
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
                    <CommandEmpty>No users found matching &quot;{suggestionQuery}&quot;</CommandEmpty>
                  )}
                </CommandList>
              </Command>
            )}

            {suggestionType === "date" && (
              <Command>
                <CommandList>
                  <CommandGroup>
                    <CommandItem
                      onSelect={insertDateSuggestion}
                      className="cursor-pointer"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>Add date: {crmDateInputString(new Date(parseDateFromText(suggestionQuery) || new Date()))}</span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
          </div>
        )}
      </div>
    );
  }

  const InputComponent = Input;

  return (
    <div className={cn("relative", className)}>
      <InputComponent
        {...rest}
        ref={combinedRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelect}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={inputClassName}
      />
      
      {showSuggestions && (
        <div className="absolute top-full z-10 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md">
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
                          index === selectedIndex && "bg-accent text-accent-foreground"
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
                  <CommandEmpty>No users found matching &quot;{suggestionQuery}&quot;</CommandEmpty>
                )}
              </CommandList>
            </Command>
          )}

          {suggestionType === "date" && (
            <Command>
              <CommandList>
                <CommandGroup>
                  <CommandItem
                    onSelect={insertDateSuggestion}
                    className="cursor-pointer"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Add date: {crmDateInputString(new Date(parseDateFromText(suggestionQuery) || new Date()))}</span>
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
