"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Msg = { type: "goto"; index: number; black: boolean } | { type: "hello" };

/**
 * Gemeinsamer Zustand von Vortrag und Referentenansicht (beide Fenster bleiben synchron).
 * Tasten wie bei Präsenter-Fernbedienungen: →/↓/Leertaste/Bild↓ weiter, ←/↑/Bild↑ zurück, B/. schwarz, F Vollbild.
 */
export function useDeck(id: string, count: number, start: number) {
  const [index, setIndex] = useState(Math.min(Math.max(0, start), Math.max(0, count - 1)));
  const [black, setBlack] = useState(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const stateRef = useRef({ index, black });
  stateRef.current = { index, black };

  useEffect(() => {
    const ch = new BroadcastChannel(`dms-vortrag-${id}`);
    channel.current = ch;
    ch.onmessage = (e: MessageEvent<Msg>) => {
      if (e.data.type === "goto") {
        setIndex(e.data.index);
        setBlack(e.data.black);
      } else if (e.data.type === "hello") {
        ch.postMessage({ type: "goto", ...stateRef.current } satisfies Msg);
      }
    };
    ch.postMessage({ type: "hello" } satisfies Msg);
    return () => ch.close();
  }, [id]);

  const show = useCallback(
    (next: number, nextBlack = false) => {
      const i = Math.min(Math.max(0, next), count - 1);
      setIndex(i);
      setBlack(nextBlack);
      channel.current?.postMessage({ type: "goto", index: i, black: nextBlack } satisfies Msg);
    },
    [count],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      const { index: i, black: b } = stateRef.current;
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter", "n"].includes(e.key)) {
        e.preventDefault();
        show(i + 1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace", "p"].includes(e.key)) {
        e.preventDefault();
        show(i - 1);
      } else if (e.key === "Home") show(0);
      else if (e.key === "End") show(count - 1);
      else if (e.key === "b" || e.key === "B" || e.key === ".") show(i, !b);
      else if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, show]);

  return { index, black, show };
}
