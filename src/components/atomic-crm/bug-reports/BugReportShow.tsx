import { ShowBase, useShowContext } from "ra-core";
import { Show } from "@/components/admin/show";
import { TextField } from "@/components/admin/text-field";
import { DateField } from "@/components/admin/date-field";
import { ReferenceField } from "@/components/admin/reference-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BugReport } from "../types";
import { Image } from "lucide-react";

export const BugReportShow = () => (
  <ShowBase>
    <BugReportShowContent />
  </ShowBase>
);

const BugReportShowContent = () => {
  const { record, isPending } = useShowContext<BugReport>();

  if (isPending || !record) {
    return null;
  }

  const statusColors = {
    open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <Show>
      <div className="space-y-6">
        {/* Header Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{record.title}</CardTitle>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={statusColors[record.status] || statusColors.open}>
                    {record.status}
                  </Badge>
                  <Badge className={priorityColors[record.priority] || priorityColors.medium}>
                    {record.priority}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Reported By</label>
                <div className="mt-1">
                  <ReferenceField source="reported_by" reference="sales" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created At</label>
                <div className="mt-1">
                  <DateField source="created_at" showTime />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                <div className="mt-1">
                  <DateField source="updated_at" showTime />
                </div>
              </div>
              {record.url && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">URL</label>
                  <div className="mt-1">
                    <a
                      href={record.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm break-all"
                    >
                      {record.url}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <TextField source="description" className="whitespace-pre-wrap" />
          </CardContent>
        </Card>

        {/* Steps to Reproduce */}
        {record.steps_to_reproduce && (
          <Card>
            <CardHeader>
              <CardTitle>Steps to Reproduce</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm">
                {record.steps_to_reproduce}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Screenshots */}
        {record.screenshot_urls && record.screenshot_urls.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Screenshots ({record.screenshot_urls.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {record.screenshot_urls.map((url, index) => (
                  <div key={index} className="relative group">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={url}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
                      />
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Technical Info */}
        {(record.browser_info || record.device_info) && (
          <Card>
            <CardHeader>
              <CardTitle>Technical Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {record.browser_info && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Browser</label>
                  <div className="mt-1 text-sm">{record.browser_info}</div>
                </div>
              )}
              {record.device_info && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Device</label>
                  <div className="mt-1 text-sm">{record.device_info}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Show>
  );
};

