"use client";

import { useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

export default function ContractSignaturePad({
  inputName = "signatureDataUrl",
  height = 180,
}: {
  inputName?: string;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const [dataUrl, setDataUrl] = useState("");
  const [hasStroke, setHasStroke] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const width = Math.max(320, Math.floor(wrap.clientWidth));
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [height]);

  function getPointFromClient(clientX: number, clientY: number): Point | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function redrawDataUrl() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const nextValue = hasStroke ? canvas.toDataURL("image/png") : "";
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = nextValue;
    }
    setDataUrl(nextValue);
  }

  useEffect(() => {
    redrawDataUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStroke]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let drawing = false;
    let last: Point | null = null;

    function beginDrawing(point: Point | null) {
      if (!point) return;
      drawing = true;
      last = point;
    }

    function continueDrawing(point: Point | null) {
      if (!drawing || !last) return;
      if (!point) return;
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      last = point;
      setHasStroke(true);
    }

    function endDrawing(pointerId?: number) {
      const targetCanvas = canvasRef.current;
      drawing = false;
      last = null;
      if (typeof pointerId === "number") {
        targetCanvas?.releasePointerCapture?.(pointerId);
      }
      redrawDataUrl();
    }

    function onPointerDown(event: PointerEvent) {
      const targetCanvas = canvasRef.current;
      beginDrawing(getPointFromClient(event.clientX, event.clientY));
      targetCanvas?.setPointerCapture?.(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
      continueDrawing(getPointFromClient(event.clientX, event.clientY));
    }

    function onPointerUp(event: PointerEvent) {
      endDrawing(event.pointerId);
    }

    function onMouseDown(event: MouseEvent) {
      beginDrawing(getPointFromClient(event.clientX, event.clientY));
    }

    function onMouseMove(event: MouseEvent) {
      continueDrawing(getPointFromClient(event.clientX, event.clientY));
    }

    function onMouseUp() {
      endDrawing();
    }

    function onTouchStart(event: TouchEvent) {
      const touch = event.changedTouches[0];
      beginDrawing(touch ? getPointFromClient(touch.clientX, touch.clientY) : null);
      event.preventDefault();
    }

    function onTouchMove(event: TouchEvent) {
      const touch = event.changedTouches[0];
      continueDrawing(touch ? getPointFromClient(touch.clientX, touch.clientY) : null);
      event.preventDefault();
    }

    function onTouchEnd(event: TouchEvent) {
      endDrawing();
      event.preventDefault();
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerUp);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerUp);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = "";
    }
    setHasStroke(false);
    setDataUrl("");
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div
        ref={wrapRef}
        style={{
          border: "1px dashed #94a3b8",
          borderRadius: 12,
          background: "#ffffff",
          overflow: "hidden",
        }}
      >
        <canvas ref={canvasRef} />
      </div>
      <input ref={hiddenInputRef} type="hidden" name={inputName} value={dataUrl} readOnly required />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          请用手写方式签名。Use a handwritten signature in the box above.
        </div>
        <button
          type="button"
          onClick={clearSignature}
          style={{
            borderRadius: 999,
            border: "1px solid #cbd5e1",
            background: "#fff",
            padding: "6px 12px",
            fontWeight: 700,
          }}
        >
          清除 / Clear
        </button>
      </div>
    </div>
  );
}
