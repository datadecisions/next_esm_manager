"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Upload, FileText, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { uploadPriceFile, repriceParts } from "@/lib/api/parts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fadeIn, fadeInUp } from "@/lib/motion";

export default function PartsUploadPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [file, setFile] = useState(null);
  const [changePrices, setChangePrices] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!token || !file) {
      toast.error("Please select a file to upload.");
      return;
    }
    setUploading(true);
    try {
      await uploadPriceFile(file, token);
      toast.success("Price file uploaded. Processing may take a few minutes.");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";

      if (changePrices) {
        toast.info("Repricing parts...");
        await repriceParts(token);
        toast.success("Reprice complete.");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to upload price file");
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || !token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-full text-foreground"
      initial={fadeIn.initial}
      animate={fadeIn.animate}
      transition={fadeIn.transition}
    >
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8 flex items-center gap-4"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <Button variant="ghost" size="icon" asChild>
            <Link href="/parts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              Upload Prices
            </h1>
            <p className="mt-1 text-muted-foreground">
              Upload price files from manufacturers (Toyota or Crown).
            </p>
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="price-file">Select price file</Label>
              <p className="mt-1 text-sm text-muted-foreground mb-2">
                Toyota or Crown format. Crown files contain &quot;dlfleet&quot; in the filename.
              </p>
              <input
                ref={inputRef}
                id="price-file"
                type="file"
                onChange={handleFileChange}
                disabled={uploading}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/15 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
              />
              {file && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium truncate">{file.name}</span>
                  <span className="text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="change-prices"
                type="checkbox"
                checked={changePrices}
                onChange={(e) => setChangePrices(e.target.checked)}
                disabled={uploading}
                className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Label htmlFor="change-prices" className="cursor-pointer">
                Change prices immediately after upload
              </Label>
            </div>

            <Button
              type="submit"
              disabled={!file || uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Submit
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}
