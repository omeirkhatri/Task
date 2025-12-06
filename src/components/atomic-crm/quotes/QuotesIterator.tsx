import { useListContext } from "ra-core";
import { FileText } from "lucide-react";

import { QuoteItem } from "./QuoteItem";

export const QuotesIterator = () => {
  const { data, error, isPending } = useListContext();
  if (isPending || error) return null;

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <p className="text-sm text-muted-foreground">No quotes yet</p>
        <p className="text-xs text-muted-foreground mt-1">Create your first quote to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((quote) => (
        <QuoteItem quote={quote} key={quote.id} />
      ))}
    </div>
  );
};

