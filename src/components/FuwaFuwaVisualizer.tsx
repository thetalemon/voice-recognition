"use client";
import React, { useRef, useEffect, useCallback } from "react";

const P5_CDN = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js";
const P5_SOUND_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/addons/p5.sound.min.js";

const FuwaFuwaVisualizer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5StartedRef = useRef(false);

  // p5.jsとp5.sound.jsのロード&スケッチ生成
  const startP5 = useCallback(() => {
    if (p5StartedRef.current) return;
    p5StartedRef.current = true;

    const isP5Loaded =
      (window as any).p5 && (window as any).p5.prototype.getAudioContext;
    const isSoundScriptLoaded = !!document.querySelector(
      `script[src="${P5_SOUND_CDN}"]`
    );

    function loadP5AndSound() {
      return new Promise<void>((resolve) => {
        if (isP5Loaded && isSoundScriptLoaded) {
          resolve();
          return;
        }
        if (!(window as any).p5) {
          const script1 = document.createElement("script");
          script1.src = P5_CDN;
          script1.async = true;
          script1.onload = () => {
            if (!isSoundScriptLoaded) {
              const script2 = document.createElement("script");
              script2.src = P5_SOUND_CDN;
              script2.async = true;
              script2.onload = () => resolve();
              document.body.appendChild(script2);
            } else {
              resolve();
            }
          };
          document.body.appendChild(script1);
        } else if (!isSoundScriptLoaded) {
          const script2 = document.createElement("script");
          script2.src = P5_SOUND_CDN;
          script2.async = true;
          script2.onload = () => resolve();
          document.body.appendChild(script2);
        } else {
          resolve();
        }
      });
    }

    let p5Instance: any = null;

    loadP5AndSound().then(() => {
      const p5 = (window as any).p5;
      if (!p5 || !containerRef.current) return;

      let radius = 50;
      let pulse = 0;
      let recognizing = false;
      let mic: any, amplitude: any;
      const THRESHOLD = 0.01;

      const sketch = (p: any) => {
        p.setup = () => {
          p.createCanvas(p.windowWidth, p.windowHeight);
          p.noFill(); // 塗りつぶしなし
          p.colorMode(p.HSL, 360, 100, 100, 1);
          mic = new p5.AudioIn();
          mic.start(() => {
            amplitude = new p5.Amplitude();
            amplitude.setInput(mic);
          });
        };
        p.draw = () => {
          p.background(0);
          const x = p.width / 2;
          const y = p.height / 2;

          // 音量取得
          const level =
            amplitude && amplitude.getLevel ? amplitude.getLevel() : 0;
          const wave = level > THRESHOLD;
          const baseRadius = 50;
          const steps = 120;
          const minAmplitude = 2;
          const maxAmplitude = 500;
          const waveAmplitude = wave
            ? Math.max(minAmplitude, Math.min(maxAmplitude, level * 60))
            : 0;
          const waveFreq = 8;
          const waveSpeed = 0.25;
          // グローの設定を狭く
          const glowAlpha = 0.5;
          const glowSteps = [2]; // グロー範囲をさらに細く

          // 六角形の虹色グラデーション＋波打ち
          const sides = 6;
          const angleStep = p.TWO_PI / sides;
          const baseRadiusHex = 50;
          const stepsHex = 40;

          p.push();
          p.translate(x, y);
          p.colorMode(p.HSL, 360, 100, 100, 1);

          // 頂点座標を計算
          const vertices: { x: number; y: number }[] = [];
          for (let i = 0; i < sides; i++) {
            const a = angleStep * i;
            vertices.push({
              x: Math.cos(a) * baseRadiusHex,
              y: Math.sin(a) * baseRadiusHex,
            });
          }
          vertices.push(vertices[0]); // 閉じる

          // グロー
          for (const glow of glowSteps) {
            p.strokeWeight(glow);
            for (let i = 0; i < sides; i++) {
              for (let j = 0; j < stepsHex; j++) {
                const t1 = j / stepsHex;
                const t2 = (j + 1) / stepsHex;
                // 波打ち
                const angle1 = p.lerp(angleStep * i, angleStep * (i + 1), t1);
                const angle2 = p.lerp(angleStep * i, angleStep * (i + 1), t2);
                const randomSeed1 = 100 + (i * stepsHex + j) * 13;
                const randomSeed2 = 100 + (i * stepsHex + j + 1) * 13;
                const waveVal1 = wave
                  ? Math.sin(angle1 * 8 + p.frameCount * 0.25) *
                      Math.max(2, Math.min(18, level * 60)) +
                    (wave
                      ? Math.sin(
                          angle1 * 2 + p.frameCount * 0.07 + randomSeed1
                        ) * 2
                      : 0)
                  : 0;
                const waveVal2 = wave
                  ? Math.sin(angle2 * 8 + p.frameCount * 0.25) *
                      Math.max(2, Math.min(18, level * 60)) +
                    (wave
                      ? Math.sin(
                          angle2 * 2 + p.frameCount * 0.07 + randomSeed2
                        ) * 2
                      : 0)
                  : 0;
                const r1 = baseRadiusHex + waveVal1;
                const r2 = baseRadiusHex + waveVal2;
                const x1 = Math.cos(angle1) * r1;
                const y1 = Math.sin(angle1) * r1;
                const x2 = Math.cos(angle2) * r2;
                const y2 = Math.sin(angle2) * r2;
                const hue = ((i + t1) / sides) * 360;
                p.stroke(hue, 100, 60, glowAlpha);
                p.line(x1, y1, x2, y2);
              }
            }
          }

          // 細い本線
          p.strokeWeight(0.1);
          for (let i = 0; i < sides; i++) {
            for (let j = 0; j < stepsHex; j++) {
              const t1 = j / stepsHex;
              const t2 = (j + 1) / stepsHex;
              // 波打ち
              const angle1 = p.lerp(angleStep * i, angleStep * (i + 1), t1);
              const angle2 = p.lerp(angleStep * i, angleStep * (i + 1), t2);
              const randomSeed1 = 100 + (i * stepsHex + j) * 13;
              const randomSeed2 = 100 + (i * stepsHex + j + 1) * 13;
              const waveVal1 = wave
                ? Math.sin(angle1 * 8 + p.frameCount * 0.25) *
                    Math.max(2, Math.min(18, level * 60)) +
                  (wave
                    ? Math.sin(angle1 * 2 + p.frameCount * 0.07 + randomSeed1) *
                      2
                    : 0)
                : 0;
              const waveVal2 = wave
                ? Math.sin(angle2 * 8 + p.frameCount * 0.25) *
                    Math.max(2, Math.min(18, level * 60)) +
                  (wave
                    ? Math.sin(angle2 * 2 + p.frameCount * 0.07 + randomSeed2) *
                      2
                    : 0)
                : 0;
              const r1 = baseRadiusHex + waveVal1;
              const r2 = baseRadiusHex + waveVal2;
              const x1 = Math.cos(angle1) * r1;
              const y1 = Math.sin(angle1) * r1;
              const x2 = Math.cos(angle2) * r2;
              const y2 = Math.sin(angle2) * r2;
              const hue = ((i + t1) / sides) * 360;
              p.stroke(hue, 100, 60);
              p.line(x1, y1, x2, y2);
            }
          }

          p.pop();
        };
        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight);
        };
      };

      if ((window as any).p5Instance) {
        (window as any).p5Instance.remove();
      }
      p5Instance = new p5(sketch, containerRef.current);
      (window as any).p5Instance = p5Instance;
    });
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if ((window as any).p5Instance) {
        (window as any).p5Instance.remove();
        (window as any).p5Instance = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh", cursor: "pointer" }}
      onClick={startP5}
      title="クリックで音声ビジュアライザを有効化"
    />
  );
};

export default FuwaFuwaVisualizer;
