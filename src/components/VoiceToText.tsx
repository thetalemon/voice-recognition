import React, { useState, useRef, useEffect } from "react";
// --- Web Speech API 型定義（TypeScript用、最低限） ---
interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

interface VoiceToTextProps {
  started: boolean;
}

const VoiceToText: React.FC<VoiceToTextProps> = ({ started }) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState(""); // 確定テキスト
  const [interim, setInterim] = useState(""); // 暫定テキスト
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecognizingRef = useRef(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsClient(true);
    }
  }, []);

  // startedがtrueになったら自動でstartListening
  useEffect(() => {
    if (started && !listening) {
      startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const startListening = () => {
    if (typeof window === "undefined") return;
    if (isRecognizingRef.current) return; // すでに認識中なら何もしない

    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      alert("このブラウザは音声認識に対応していません。");
      return;
    }

    let recognition: SpeechRecognition | null = recognitionRef.current;
    if (!recognition) {
      recognition = new SpeechRecognitionConstructor();
      recognition.lang = "ja-JP";
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = "";
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
        }
        setInterim(interimTranscript);
      };

      (recognition as any).onstart = () => {
        isRecognizingRef.current = true;
        setListening(true);
      };
      (recognition as any).onend = () => {
        isRecognizingRef.current = false;
        setListening(false);
      };
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        isRecognizingRef.current = false;
        setListening(false);
        alert("音声認識エラー: " + event.error);
      };

      recognitionRef.current = recognition;
    }

    // ここで「認識中」ならstart()しない
    if (isRecognizingRef.current) return;
    isRecognizingRef.current = true; // start()直前に即時セット

    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
    recognitionRef.current = null;
    setInterim(""); // 停止時に暫定テキストをクリア
  };

  if (!isClient) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1000,
        minWidth: 320,
        maxWidth: 600,
        minHeight: 80,
        border: "1px solid #ccc",
        borderRadius: 12,
        padding: 20,
        background: "rgba(250,250,250,0.85)",
        fontSize: 22,
        whiteSpace: "pre-wrap",
        boxShadow: "0 4px 24px #0003",
        textAlign: "center",
      }}
    >
      {transcript + interim || "ここに音声認識結果が表示されます"}
    </div>
  );
};

export default VoiceToText;
