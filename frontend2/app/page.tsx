"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";

// configure pdf.js worker using a locally bundled module worker
if (typeof window !== "undefined" && typeof Worker !== "undefined") {
  try {
    const worker = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url),
      { type: "module" }
    );
    // assign the worker so pdf.js does not attempt network fetching
    (GlobalWorkerOptions as any).workerPort = worker;
  } catch {
    // fallback to main-thread fake worker if bundling fails
    (GlobalWorkerOptions as any).workerPort = null;
  }
}

type StepResponse = { id: number; slide: number; text: string };

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [lectureId, setLectureId] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingSlide, setIsLoadingSlide] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const canPrev = currentSlide > 1;
  const canNext = numPages ? currentSlide < numPages : true;

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setLectureId(null);
    setCurrentSlide(1);
    setPdfDoc(null);
    setNumPages(0);
  };

  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDoc || !canvasRef.current) return;
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
  }, [pdfDoc]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentSlide);
    }
  }, [pdfDoc, currentSlide, renderPage]);

  const createLecture = useCallback(async () => {
    if (!file) return;
    setIsCreating(true);
    try {
      const form = new FormData();
      form.append("file_obj", file);

      const res = await fetch("/api/backend/lectures/instantiate-lecture", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("failed to instantiate");
      const data = await res.json();
      const newLectureId = data.id as number;
      setLectureId(newLectureId);

      // Load PDF locally for display
      const arrayBuf = await file.arrayBuffer();
      const doc = await (getDocument as any)({ data: arrayBuf }).promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);

      // Do first step and play audio
      await doStepAndPlay(newLectureId, 1);
      setCurrentSlide(1);
    } finally {
      setIsCreating(false);
    }
  }, [file]);

  const doStepAndPlay = useCallback(async (lecId: number, slide: number) => {
    setIsLoadingSlide(true);
    try {
      const stepRes = await fetch(`/api/backend/lectures/step/${lecId}/${slide}`);
      if (!stepRes.ok) throw new Error("step failed");
      const _step: StepResponse = await stepRes.json();

      // Play audio
      const audioUrl = `/api/backend/lectures/audio/${lecId}/${slide}`;
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play().catch(() => {});
      }
    } finally {
      setIsLoadingSlide(false);
    }
  }, []);

  const goPrev = useCallback(async () => {
    if (!lectureId || !canPrev) return;
    const target = currentSlide - 1;
    setCurrentSlide(target);
    await doStepAndPlay(lectureId, target);
  }, [lectureId, currentSlide, canPrev, doStepAndPlay]);

  const goNext = useCallback(async () => {
    if (!lectureId || !canNext) return;
    const target = currentSlide + 1;
    setCurrentSlide(target);
    await doStepAndPlay(lectureId, target);
  }, [lectureId, currentSlide, canNext, doStepAndPlay]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Deepest Learning</h1>

      <div className="w-full max-w-4xl flex flex-col gap-3">
        <input
          type="file"
          accept="application/pdf"
          onChange={onFileChange}
          className="border p-2 rounded"
        />

        <button
          onClick={createLecture}
          disabled={!file || isCreating}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50 w-fit"
        >
          {isCreating ? "Creating..." : "create lecture"}
        </button>
      </div>

      <div className="w-full max-w-4xl flex items-center justify-center gap-4">
        <button
          onClick={goPrev}
          disabled={!lectureId || !canPrev || isLoadingSlide}
          className="px-3 py-2 border rounded disabled:opacity-50"
        >
          ←
        </button>
        <div className="flex-1 flex items-center justify-center border rounded p-2 bg-white">
          <canvas ref={canvasRef} className="max-h-[75vh]" />
        </div>
        <button
          onClick={goNext}
          disabled={!lectureId || !canNext || isLoadingSlide}
          className="px-3 py-2 border rounded disabled:opacity-50"
        >
          →
        </button>
      </div>

      <audio ref={audioRef} controls className="mt-2" />

      {lectureId && (
        <div className="text-sm text-gray-600">
          lecture {lectureId} — slide {currentSlide}/{numPages || "?"}
        </div>
      )}
    </div>
  );
}
