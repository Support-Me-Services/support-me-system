import React from "react";

export interface HtmlContentProps {
  /** Server-sanitized HTML (OWASP Java HTML Sanitizer on the backend) - safe to render directly. */
  html: string;
}

/** Renders backend-sanitized "about" page HTML. Web only needs a plain div - no client-side sanitization since the backend already stripped anything unsafe before this ever reaches the browser. */
export function HtmlContent({ html }: HtmlContentProps) {
  return (
    <div
      className="prose max-w-none font-sans text-[16px] leading-[1.6] text-foreground [&_a]:text-primary [&_h1]:font-serif [&_h2]:font-serif [&_h3]:font-serif [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
