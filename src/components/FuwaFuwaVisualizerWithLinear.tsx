"use client";
import React, { useRef, useEffect, useCallback } from "react";

const P5_CDN = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js";
const P5_SOUND_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/addons/p5.sound.min.js";

interface FuwaFuwaVisualizerWithLinearProps {
  started: boolean;
}

const FuwaFuwaVisualizerWithLinear: React.FC<
  FuwaFuwaVisualizerWithLinearProps
> = ({ started }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5StartedRef = useRef(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let p5Instance: any = null;

    loadP5AndSound().then(() => {
      const p5 = (window as any).p5;
      if (!p5 || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let mic: any, amplitude: any;
      const THRESHOLD = 0.01;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let fft: any;
      let spectrum: number[] = [];
      const barCount = 32;
      let barRadius = 32; // 仮の初期値、実際はp.draw内で再設定
      const barLength = 32;
      const barThreshold = 12; // この値未満の音量では粒を出さない

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sketch = (p: any) => {
        p.setup = () => {
          p.createCanvas(p.windowWidth, p.windowHeight);
          p.noFill(); // 塗りつぶしなし
          p.colorMode(p.HSL, 360, 100, 100, 1);
          mic = new p5.AudioIn();
          mic.start(() => {
            amplitude = new p5.Amplitude();
            amplitude.setInput(mic);
            fft = new p5.FFT(0.8, barCount * 2); // スムージング, バー数
            fft.setInput(mic);
          });
        };
        p.draw = () => {
          // カメラ映像をcanvas全体にストレッチ描画
          if (videoRef.current && videoRef.current.readyState >= 2) {
            // ドット絵変換用パラメータ
            const dotSize = 24; // ドットの大きさ（大きいほど荒い）
            // videoの内容を一時的なcanvasに描画
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = p.width;
            tempCanvas.height = p.height;
            const tempCtx = tempCanvas.getContext("2d");
            if (tempCtx) {
              // 映像を左右反転（ミラー）
              tempCtx.save();
              tempCtx.translate(p.width, 0);
              tempCtx.scale(-1, 1);
              tempCtx.drawImage(videoRef.current, 0, 0, p.width, p.height);
              tempCtx.restore();
              const imgData = tempCtx.getImageData(0, 0, p.width, p.height);
              // p5.jsのピクセル操作
              p.colorMode(p.RGB, 255);
              p.stroke(0);
              p.strokeWeight(18);
              for (let y = 0; y < p.height; y += dotSize) {
                for (let x = 0; x < p.width; x += dotSize) {
                  const idx = (y * p.width + x) * 4;
                  const r = imgData.data[idx];
                  const g = imgData.data[idx + 1];
                  const b = imgData.data[idx + 2];
                  // 明度反転したgray値で水色の階調
                  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                  const invGray = 255 - gray;
                  // 彩度を下げた水色（全体的に暗め）
                  p.fill(0, gray * 0.6, 180);
                  p.ellipse(x + dotSize / 2, y + dotSize / 2, dotSize, dotSize);
                }
              }
              p.colorMode(p.HSL, 360, 100, 100, 1);
            }
          } else {
            p.background(0);
          }
          const x = p.width / 2;
          const y = p.height - 80;

          // 音量取得
          const level =
            amplitude && amplitude.getLevel ? amplitude.getLevel() : 0;
          const wave = level > THRESHOLD;
          const glowAlpha = 0.5;
          const glowSteps = [2];

          // 六角形の虹色グラデーション＋波打ち
          const sides = 6;
          const angleStep = p.TWO_PI / sides;
          const baseRadiusHex = 50;
          const stepsHex = 40;
          barRadius = baseRadiusHex - 2;
          if (fft) spectrum = fft.analyze();

          p.push();
          p.translate(x, y);
          p.colorMode(p.HSL, 360, 100, 100, 1);
          // 六角形の虹色グラデーション＋波打ちの背景に黒円を描画
          p.noStroke();
          p.fill(0);
          p.ellipse(0, 0, baseRadiusHex * 2 + 4, baseRadiusHex * 2 + 12);

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
                      Math.max(0.5, Math.min(72, level * 400)) +
                    (wave
                      ? Math.sin(
                          angle1 * 2 + p.frameCount * 0.07 + randomSeed1
                        ) * 2
                      : 0)
                  : 0;
                const waveVal2 = wave
                  ? Math.sin(angle2 * 8 + p.frameCount * 0.25) *
                      Math.max(0.5, Math.min(72, level * 400)) +
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

          // --- ここからリニアバーの円周配置 ---
          p.push();
          // 高音域を使わず低音域を全体にマッピング
          const expandRatio = 0.3; // 0.3=さらに低音域だけを全体に引き伸ばす
          for (let i = 0; i < barCount; i++) {
            const angle = (p.TWO_PI / barCount) * i;
            const mappedIndex = Math.floor(
              i * expandRatio * (spectrum.length / barCount)
            );
            const value = spectrum[mappedIndex] || 0;
            let amp = p.map(value, 0, 255, 0, barLength);
            // 高音域（mappedIndexが大きい場合）は反応を強く
            if (mappedIndex > spectrum.length * 0.05) {
              amp *= 2.5;
            }
            if (amp < barThreshold) continue;
            const hue = (i / barCount) * 360;
            p.noStroke();
            p.fill(hue, 100, 60);
            const dotCount = Math.floor(amp / 3);
            for (let d = 0; d < dotCount; d++) {
              const r = barRadius - d * 3;
              const dotX = Math.cos(angle) * r;
              const dotY = Math.sin(angle) * r;
              p.ellipse(dotX, dotY, 3, 3);
            }
          }
          p.pop();
          // --- ここまでリニアバーの円周配置 ---

          // --- ここから中心のふわふわ虹色円 ---
          const centerRadius = 3 + level * 400; // 変化量を大きく
          // 虹色グラデーションで塗りつぶし
          p.noStroke();
          for (let i = 0; i < 60; i++) {
            const angle1 = (p.TWO_PI / 60) * i;
            const angle2 = (p.TWO_PI / 60) * (i + 1);
            const hue = (i / 60) * 360;
            p.fill(hue, 100, 60);
            p.beginShape();
            p.vertex(0, 0);
            p.vertex(
              Math.cos(angle1) * centerRadius,
              Math.sin(angle1) * centerRadius
            );
            p.vertex(
              Math.cos(angle2) * centerRadius,
              Math.sin(angle2) * centerRadius
            );
            p.endShape(p.CLOSE);
          }
          // 本体
          for (let i = 0; i < 60; i++) {
            const angle = (p.TWO_PI / 60) * i;
            const hue = (i / 60) * 360;
            p.stroke(hue, 100, 60);
            p.strokeWeight(1.2);
            const x0 = Math.cos(angle) * centerRadius;
            const y0 = Math.sin(angle) * centerRadius;
            const x1 = Math.cos(angle + p.TWO_PI / 60) * centerRadius;
            const y1 = Math.sin(angle + p.TWO_PI / 60) * centerRadius;
            p.line(x0, y0, x1, y1);
          }
          // --- ここまで中心のふわふわ虹色円 ---

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

  // カメラ映像取得のみ
  React.useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
        if (videoRef.current.paused || videoRef.current.readyState < 2) {
          videoRef.current.play().catch(() => {});
        }
      }
    })();
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
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

  useEffect(() => {
    if (started) {
      startP5();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        position: "relative",
      }}
    >
      {/* カメラ映像は非表示で配置 */}
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />
      <div
        ref={containerRef}
        style={{
          width: "100vw",
          height: "100vh",
          display: started ? undefined : "none",
        }}
        title="クリックで音声ビジュアライザを有効化"
      />
    </div>
  );
};

export default FuwaFuwaVisualizerWithLinear;
