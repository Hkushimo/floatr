import Head from "next/head";
import { useEffect } from "react";
import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(`${basePath}/sw.js`).catch(() => {});
  }, [basePath]);

  return (
    <>
      <Head>
        <meta name="application-name" content="Floatr" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Floatr" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#080d12" />
        <link rel="manifest" href={`${basePath}/manifest.webmanifest`} />
        <link rel="icon" href={`${basePath}/icons/icon.svg`} type="image/svg+xml" />
        <link rel="apple-touch-icon" href={`${basePath}/icons/apple-touch-icon.png`} />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
