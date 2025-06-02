import React from 'react'
import Head from 'next/head'
import '../styles/global.css'

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="referrer" content="no-referrer" />
        <title>Trust Crypto Wallet - Secure Multi-Chain Wallet</title>
        <meta name="description" content="Trust Crypto Wallet - Secure, fast, and user-friendly multi-chain cryptocurrency wallet" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
