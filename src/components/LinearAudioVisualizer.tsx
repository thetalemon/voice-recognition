"use client";
import React, { useRef, useEffect } from "react";

const LinearAudioVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array;
    let source: MediaStreamAudioSourceNode | null = null;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    const WIDTH = 600;
    const HEIGHT = 120;

    if (canvas) {
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
    }

    async function setup() {
      try {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        source = audioContextRef.current.createMediaStreamSource(stream);
        analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 128; // バーの数（大きくすると細かくなる）
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);

        draw();
      } catch (e) {
        console.error("マイクの取得に失敗:", e);
      }
    }

    function draw() {
      if (!ctx || !analyser) return;
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      const barWidth = (WIDTH / dataArray.length) * 1.5;
      let x = 0;
      const THRESHOLD = 200; // 0〜255の範囲で調整（大きいほど静かな時に動かなくなる）
      const expandRatio = 0.5; // 低音域を全体に広げる比率（0.5=前半だけを全体に引き伸ばす）
      for (let i = 0; i < dataArray.length; i++) {
        const mappedIndex = Math.floor(i * expandRatio);
        let barHeight = (dataArray[mappedIndex] / 255) * HEIGHT;
        if (barHeight < THRESHOLD * (HEIGHT / 255)) barHeight = 0;
        ctx.fillStyle = "rgb(" + (50 + barHeight * 2) + ",150,255)";
        ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      animationRef.current = requestAnimationFrame(draw);
    }

    setup();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // 追加: ユーザー操作でAudioContextをresume
  const handleClick = async () => {
    if (
      audioContextRef.current &&
      audioContextRef.current.state !== "running"
    ) {
      await audioContextRef.current.resume();
    }
  };

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <canvas
        ref={canvasRef}
        style={{ background: "#111", borderRadius: 8, cursor: "pointer" }}
        onClick={handleClick}
        title="クリックで音声ビジュアライザを有効化"
      />
    </div>
  );
};

export default LinearAudioVisualizer;
