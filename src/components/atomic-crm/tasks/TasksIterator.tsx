import { isAfter } from "date-fns";
import { useListContext } from "ra-core";
import { CheckSquare } from "lucide-react";

import { Task } from "./Task";

export const TasksIterator = ({
  showContact,
  className,
  showAll,
}: {
  showContact?: boolean;
  className?: string;
  showAll?: boolean;
}) => {
  const { data, error, isPending } = useListContext();
  if (isPending || error) return null;

  // If showAll is true, show all tasks (including completed ones)
  // Otherwise, keep only tasks that are not done or done less than 5 minutes ago
  const tasks = showAll 
    ? data
    : data.filter(
        (task) =>
          !task.done_date ||
          isAfter(new Date(task.done_date), new Date(Date.now() - 5 * 60 * 1000)),
      );

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckSquare className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <p className="text-sm text-muted-foreground">No tasks yet</p>
        <p className="text-xs text-muted-foreground mt-1">Create your first task to get started</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className || ""}`}>
      {tasks.map((task) => (
        <Task task={task} showContact={showContact} key={task.id} />
      ))}
    </div>
  );
};
