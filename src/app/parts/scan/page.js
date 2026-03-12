"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, CameraOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getBinParts } from "@/lib/api/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fadeIn, fadeInUp } from "@/lib/motion";
import jsQR from "jsqr";

export default function PartsScanPage() {
  const { token, isLoading: authLoading } = useAuth({ redirectToSignIn: true });
  const [binInput, setBinInput] = useState("");
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  const lookupBin = useCallback(
    async (binNo) => {
      if (!token || !binNo?.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getBinParts(binNo.trim(), token);
        setParts(data);
        setLastScanned(binNo.trim());
      } catch (err) {
        setError(err?.message || "Failed to fetch bin parts");
        setParts([]);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    lookupBin(binInput);
  };

  const handleScanSuccess = useCallback(
    (data) => {
      lookupBin(data);
      setScanning(false);
      stopCamera();
    },
    [lookupBin]
  );

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera not supported in this browser.");
      return;
    }
    setError(null);
    setScanning(true);
    try {
      // Try environment (rear) first for mobile, fall back to any camera
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setError(
        err?.message === "Requested device not found"
          ? "No camera found. Use manual bin entry, or allow camera access and ensure a camera is connected."
          : err?.message || "Could not access camera. Check browser permissions."
      );
      setScanning(false);
    }
  }, []);

  const stopScanning = useCallback(() => {
    setScanning(false);
    stopCamera();
  }, []);

  useEffect(() => {
    if (!scanning || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function tick() {
      if (!streamRef.current || !video.videoWidth) {
        animationRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        handleScanSuccess(code.data);
        return;
      }
      animationRef.current = requestAnimationFrame(tick);
    }
    tick();
    return () => stopCamera();
  }, [scanning, handleScanSuccess]);

  if (authLoading || !token) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-full bg-gradient-to-b from-slate-50 to-cyan-50/30 dark:from-slate-950 dark:to-slate-900"
      initial={fadeIn.initial}
      animate={fadeIn.animate}
      transition={fadeIn.transition}
    >
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
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
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
              Scan Parts / Bin
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Find parts by bin number. Enter manually or scan a barcode/QR.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="space-y-6"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ ...fadeInUp.transition, delay: 0.05 }}
        >
          {/* Manual input */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="bin">Bin Number</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="bin"
                    value={binInput}
                    onChange={(e) => setBinInput(e.target.value)}
                    placeholder="Enter bin number..."
                    className="flex-1"
                    autoComplete="off"
                  />
                  <Button type="submit" disabled={loading || !binInput.trim()}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Lookup"
                    )}
                  </Button>
                </div>
              </div>
            </form>

            {/* Camera scan toggle */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              {!scanning ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={startCamera}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Scan with camera
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden bg-slate-900 aspect-video max-w-md">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="border-2 border-cyan-400 rounded-lg w-48 h-48 opacity-80" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Point your camera at a QR code or barcode with a bin number.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={stopScanning}
                    className="gap-2"
                  >
                    <CameraOff className="h-4 w-4" />
                    Stop camera
                  </Button>
                </div>
              )}
            </div>

            {error && (
              <p className="mt-4 text-sm text-destructive">{error}</p>
            )}
          </div>

          {/* Results */}
          {(parts.length > 0 || (lastScanned && parts.length === 0)) && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
              <h2 className="text-lg font-semibold mb-4">
                Bin {lastScanned}
                {parts.length === 0 && " — No parts found"}
              </h2>
              {parts.length > 0 && (
                <div className="rounded-lg border dark:border-slate-700 overflow-hidden">
                  <div className="max-h-[50vh] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800/80">
                          <TableHead className="font-semibold">Part #</TableHead>
                          <TableHead className="font-semibold">Warehouse</TableHead>
                          <TableHead className="font-semibold">Description</TableHead>
                          <TableHead className="font-semibold text-right">On Hand</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parts.map((p) => (
                          <TableRow key={`${p.PartNo}-${p.Warehouse}`}>
                            <TableCell className="font-medium">
                              <Link
                                href={`/parts/inventory/${encodeURIComponent(p.PartNo)}/${encodeURIComponent(p.Warehouse ?? "Main")}`}
                                className="text-cyan-600 dark:text-cyan-400 hover:underline"
                              >
                                {p.PartNo}
                              </Link>
                            </TableCell>
                            <TableCell>{p.Warehouse ?? "—"}</TableCell>
                            <TableCell>{p.Description ?? "—"}</TableCell>
                            <TableCell className="text-right">{p.OnHand ?? p.Qty ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
