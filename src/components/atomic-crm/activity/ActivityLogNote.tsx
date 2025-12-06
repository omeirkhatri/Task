import { Fragment, type ReactNode } from "react";

type ActivityLogContactNoteCreatedProps = {
  header: ReactNode;
  text: string;
};

export function ActivityLogNote({
  header,
  text,
}: ActivityLogContactNoteCreatedProps) {
  if (!text) {
    return null;
  }
  const paragraphs = text.split("\n");

  return (
    <div className="p-0">
      <div className="flex flex-col space-y-2 w-full">
        <div className="flex flex-row space-x-1 items-center w-full justify-between">
          <div className="w-5 h-5 bg-blue-200 rounded-full flex-shrink-0" />
          <div className="flex flex-row items-center flex-grow min-w-0 justify-between">
            {header}
          </div>
        </div>
        <div className="ml-6 mt-1">
          <div className="text-sm text-muted-foreground line-clamp-3 overflow-hidden">
            {paragraphs.map((paragraph: string, index: number) => (
              <Fragment key={index}>
                {paragraph}
                {index < paragraphs.length - 1 && <br />}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
