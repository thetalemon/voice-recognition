import Head from "next/head";
import dynamic from "next/dynamic";
const VoiceToText = dynamic(() => import("../components/VoiceToText"), {
  ssr: false,
});
import styles from "../styles/Home.module.css";
const FuwaFuwaVisualizerWithLinear = dynamic(
  () => import("@/components/FuwaFuwaVisualizerWithLinear"),
  { ssr: false }
);

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Voice Recognition Sample.</title>
        <meta name="description" content="音声認識のサンプルページ" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <VoiceToText />
        <FuwaFuwaVisualizerWithLinear />
      </main>
    </div>
  );
}
