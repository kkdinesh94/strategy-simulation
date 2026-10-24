import React from "react";

/**
 * Renders an engine news line. Lines may contain <b>…</b> around team names; everything
 * else is shown as plain text. Never pass news through dangerouslySetInnerHTML: team names
 * are chosen by players, so they could otherwise inject script into everyone's browser.
 */
export function NewsText({ text }: { text: string }) {
  const parts = String(text).split(/(<b>.*?<\/b>)/g);
  return (
    <>
      {parts.map((part, i) => {
        const bold = part.match(/^<b>(.*?)<\/b>$/);
        const clean = (bold ? bold[1] : part).replace(/<[^>]*>/g, "");
        return bold ? <strong key={i} className="font-semibold text-[#1F2022]">{clean}</strong> : <React.Fragment key={i}>{clean}</React.Fragment>;
      })}
    </>
  );
}
