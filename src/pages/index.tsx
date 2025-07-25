import { useState } from "react";
import dynamic from "next/dynamic";
const VoiceToText = dynamic(() => import("../components/VoiceToText"), {
  ssr: false,
});
const FuwaFuwaVisualizerWithLinear = dynamic(
  () => import("@/components/FuwaFuwaVisualizerWithLinear"),
  { ssr: false }
);
import styles from "../styles/Home.module.css";
import Head from "next/head";

export default function Home() {
  const [started, setStarted] = useState(false);

  return (
    <div className={styles.container}>
      <Head>
        <title>Voice Recognition Sample.</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        {!started && (
          <button
            onClick={() => setStarted(true)}
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
              cursor: "pointer",
            }}
          >
            音声認識を開始
          </button>
        )}
        {started && <VoiceToText started={started} />}
        <FuwaFuwaVisualizerWithLinear started={started} />
      </main>
    </div>
  );
}
