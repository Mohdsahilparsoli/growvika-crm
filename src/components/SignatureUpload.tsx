"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "./ui";

// Turns a photo of a signature into a clean PNG: removes the paper background,
// crops to the ink and scales it down so it stays small.
async function cleanSignature(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Could not read this image"));
      i.src = url;
    });
    const maxSide = 1400;
    const s0 = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.round(img.width * s0);
    const h = Math.round(img.height * s0);
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;

    // Estimate paper brightness from the average luminance
    let sum = 0;
    for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    const avg = sum / (px.length / 4);
    const threshold = Math.min(avg - 25, 200);

    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        if (px[i + 3] < 20 || lum > threshold) {
          px[i + 3] = 0;
        } else {
          // Darker ink = more opaque; keep ink colour but deepen it slightly
          const a = Math.min(255, Math.round(((threshold - lum) / Math.max(threshold, 1)) * 255 * 2.2));
          px[i] = Math.round(px[i] * 0.6);
          px[i + 1] = Math.round(px[i + 1] * 0.6);
          px[i + 2] = Math.round(px[i + 2] * 0.6);
          px[i + 3] = Math.max(px[i + 3] === 255 ? a : Math.min(a, px[i + 3]), 60);
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) throw new Error("No signature found in this photo. Try a clearer photo on white paper.");
    ctx.putImageData(data, 0, 0);

    const pad = 8;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad);
    maxY = Math.min(h - 1, maxY + pad);
    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;
    const outW = Math.min(600, cw);
    const outH = Math.round((ch * outW) / cw);
    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;
    out.getContext("2d")!.drawImage(cv, minX, minY, cw, ch, 0, 0, outW, outH);
    return out.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function SignatureUpload({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setErr("");
    if (!/^image\//.test(f.type)) return setErr("Please choose a photo (JPG or PNG)");
    setBusy(true);
    try {
      const png = await cleanSignature(f);
      if (png.length > 590_000) throw new Error("Signature image is too large. Try a smaller photo.");
      onChange(png);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-20 w-56 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-[repeating-conic-gradient(#f8fafc_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Signature" className="max-h-16 max-w-52 object-contain" />
          ) : (
            <span className="text-xs text-slate-400">No signature yet</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          <Button type="button" variant="secondary" size="sm" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {value ? "Change photo" : "Upload photo"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              <Trash2 size={14} className="text-red-500" /> Remove
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">Sign with a dark pen on plain white paper and take a clear photo. The background is removed automatically. Click &quot;Save company details&quot; after uploading.</p>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}
