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

      recognition.onend = () => {
        setListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setListening(false);
        alert("音声認識エラー: " + event.error);
      };

      recognitionRef.current = recognition;
    }

    if (!recognition) return; // 型ガード
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
    recognitionRef.current = null;
    setInterim(""); // 停止時に暫定テキストをクリア
  };

  if (!isClient) return null;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <div
        style={{
          minHeight: 80,
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: 12,
          background: "#fafafa",
          fontSize: 18,
          whiteSpace: "pre-wrap",
        }}
      >
        {transcript + interim || "ここに音声認識結果が表示されます"}
      </div>
    </div>
  );
};

export default VoiceToText;
