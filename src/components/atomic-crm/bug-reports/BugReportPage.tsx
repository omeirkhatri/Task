import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useCreate, useGetIdentity, useNotify } from "ra-core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "../providers/supabase/supabase";
import { Upload, X, Image as ImageIcon, CheckCircle2 } from "lucide-react";

type BugReportFormData = {
  title: string;
  description: string;
  steps_to_reproduce: string;
  priority: "low" | "medium" | "high" | "critical";
  screenshot_urls: string[];
};

export const BugReportPage = () => {
  const { identity } = useGetIdentity();
  const [create] = useCreate();
  const notify = useNotify();
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<BugReportFormData>({
    defaultValues: {
      title: "",
      description: "",
      steps_to_reproduce: "",
      priority: "medium",
      screenshot_urls: [],
    },
  });

  const priority = watch("priority");

  const handleScreenshotUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      notify("Please select image files only", { type: "error" });
      return;
    }

    if (screenshots.length + imageFiles.length > 5) {
      notify("Maximum 5 screenshots allowed", { type: "error" });
      return;
    }

    setScreenshots((prev) => [...prev, ...imageFiles]);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadScreenshots = async (): Promise<string[]> => {
    if (screenshots.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const file of screenshots) {
      const ext = file.name.split(".").pop() || "png";
      const base = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const path = `bug-reports/${base}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      const { data } = supabase.storage.from("attachments").getPublicUrl(path);
      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const onSubmit = async (data: BugReportFormData) => {
    if (!identity?.id) {
      notify("Please log in to submit a bug report", { type: "error" });
      return;
    }

    setUploading(true);
    try {
      // Upload screenshots first
      const screenshotUrls = await uploadScreenshots();

      // Get browser and device info
      const browserInfo = `${navigator.userAgent}`;
      const deviceInfo = `${window.screen.width}x${window.screen.height}`;
      const url = window.location.href;

      // Create bug report
      await create(
        "bug_reports",
        {
          data: {
            reported_by: identity.id,
            title: data.title,
            description: data.description,
            steps_to_reproduce: data.steps_to_reproduce || null,
            screenshot_urls: screenshotUrls,
            priority: data.priority,
            status: "open",
            browser_info: browserInfo,
            device_info: deviceInfo,
            url: url,
          },
        },
        {
          onSuccess: () => {
            notify("Bug report submitted successfully! Thank you for your feedback.", {
              type: "success",
            });
            setSubmitted(true);
            reset();
            setScreenshots([]);
            setTimeout(() => setSubmitted(false), 5000);
          },
          onError: (error: unknown) => {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to submit bug report. Please try again.";
            notify(errorMessage, { type: "error" });
          },
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to upload screenshots. Please try again.";
      notify(errorMessage, { type: "error" });
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400 mb-4" />
              <h2 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
                Bug Report Submitted!
              </h2>
              <p className="text-green-700 dark:text-green-300 text-center">
                Thank you for reporting this issue. Our team will review it and get back to you soon.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Report a Bug</CardTitle>
          <CardDescription>
            Help us improve by reporting any issues you encounter. Please provide as much detail as
            possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-sm font-medium mb-1.5 block">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                {...register("title", { required: "Title is required" })}
                placeholder="Brief description of the bug"
                className="h-10"
              />
              {errors.title && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-medium mb-1.5 block">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                {...register("description", { required: "Description is required" })}
                placeholder="Describe what happened and what you expected to happen"
                rows={5}
                className="resize-none"
              />
              {errors.description && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Steps to Reproduce */}
            <div>
              <Label htmlFor="steps_to_reproduce" className="text-sm font-medium mb-1.5 block">
                Steps to Reproduce
              </Label>
              <Textarea
                id="steps_to_reproduce"
                {...register("steps_to_reproduce")}
                placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Help us reproduce the issue by listing the steps you took
              </p>
            </div>

            {/* Priority */}
            <div>
              <Label htmlFor="priority" className="text-sm font-medium mb-1.5 block">
                Priority
              </Label>
              <Select
                value={priority}
                onValueChange={(value) => setValue("priority", value as any)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor issue, doesn't affect functionality</SelectItem>
                  <SelectItem value="medium">Medium - Some impact on usability</SelectItem>
                  <SelectItem value="high">High - Significant impact on functionality</SelectItem>
                  <SelectItem value="critical">Critical - Blocks core functionality</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Screenshots */}
            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                Screenshots (Optional)
              </Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="screenshot-upload"
                    className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Upload Screenshots</span>
                  </label>
                  <input
                    id="screenshot-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleScreenshotUpload(e.target.files)}
                    disabled={screenshots.length >= 5}
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {screenshots.length}/5 images
                  </span>
                </div>

                {screenshots.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {screenshots.map((file, index) => (
                      <div
                        key={index}
                        className="relative group border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-32 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeScreenshot(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800">
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {file.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Upload up to 5 screenshots to help us understand the issue better
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="submit"
                disabled={uploading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 font-medium disabled:opacity-50"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  "Submit Bug Report"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

BugReportPage.path = "/bug-reports";

