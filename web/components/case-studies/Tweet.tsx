'use client';

import Script from 'next/script';
import { useEffect } from 'react';

type TwitterWindow = Window & { twttr?: { widgets?: { load: () => void } } };

interface TweetProps {
  /** The post's x.com URL. */
  url: string;
  author: string;
  handle: string;
  /** The post's date as shown, e.g. "October 25, 2026". */
  date: string;
  /** The post's text, shown until (or if) X's widget script loads. */
  text: string;
}

/**
 * An X post. Renders X's standard blockquote, which reads as a normal quote,
 * and X's widget script upgrades it to the embedded post when it loads.
 */
export function Tweet({ url, author, handle, date, text }: TweetProps) {
  useEffect(() => {
    // A client-side navigation lands after the script has already run once.
    (window as TwitterWindow).twttr?.widgets?.load();
  }, [url]);

  return (
    <>
      <blockquote className="twitter-tweet" data-dnt="true" data-theme="dark">
        <p lang="en" dir="ltr">
          {text}
        </p>
        &mdash; {author} (@{handle}) <a href={url}>{date}</a>
      </blockquote>
      <Script src="https://platform.x.com/widgets.js" strategy="lazyOnload" />
    </>
  );
}
