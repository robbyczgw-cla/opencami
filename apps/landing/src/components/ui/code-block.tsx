import type { ReactNode } from "react";
import { useState } from "react";

type CodeBlockProps = {
  className?: string;
  children: ReactNode;
};

type CodeBlockCodeProps = {
  code: string;
  language?: string;
};

export function CodeBlock({ className, children }: CodeBlockProps) {
  return (
    <div className={className}>
      <div>
        <pre className="group relative m-0 overflow-x-auto rounded-[6px] bg-white p-4 text-[13px] text-neutral-800">
          {children}
        </pre>
      </div>
    </div>
  );
}

export function CodeBlockCode({ code, language }: CodeBlockCodeProps) {
  const resolvedLanguage = language ?? "text";
  const [hasCopied, setHasCopied] = useState(false);
  const lines = code.split("\n");

  async function handleCopy() {
    if (!navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 1600);
    } catch {
      setHasCopied(false);
    }
  }

  function renderBashLine(line: string) {
    const match = /^(gh|cd|pnpm|curl)\s(.+)$/.exec(line);
    const command = match?.[1];
    const rest = match ? ` ${match[2]}` : line;

    if (command === "curl") {
      const pipeIndex = rest.indexOf("|");
      const beforePipe =
        pipeIndex === -1 ? rest : rest.slice(0, pipeIndex).trimEnd();
      const afterPipe =
        pipeIndex === -1 ? "" : rest.slice(pipeIndex + 1).trim();
      const urlMatch = /https?:\/\/\S+/.exec(beforePipe);
      const segments: ReactNode[] = [];

      if (urlMatch) {
        const urlStart = urlMatch.index ?? 0;
        const urlEnd = urlStart + urlMatch[0].length;
        const prefix = beforePipe.slice(0, urlStart);
        const url = urlMatch[0];
        const suffix = beforePipe.slice(urlEnd);

        if (prefix) {
          segments.push(<span className="text-neutral-800">{prefix}</span>);
        }
        segments.push(<span className="text-neutral-500">{url}</span>);
        if (suffix) {
          segments.push(<span className="text-neutral-800">{suffix}</span>);
        }
      } else {
        segments.push(<span className="text-neutral-800">{beforePipe}</span>);
      }

      if (afterPipe) {
        segments.push(<span className="text-neutral-400">{" | "}</span>);
        segments.push(<span className="text-neutral-500">{afterPipe}</span>);
      }

      return (
        <span>
          <span className="text-neutral-900">curl</span>
          {segments}
        </span>
      );
    }

    return (
      <span>
        {command ? <span className="text-neutral-900">{command}</span> : null}
        <span className="text-neutral-500">{rest}</span>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={hasCopied ? "Copied" : "Copy command"}
        className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[6px] text-neutral-500 opacity-0 transition duration-150 ease-out group-hover:opacity-100 hover:text-neutral-900"
        onClick={handleCopy}
      >
        {hasCopied ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 14L8.5 17.5L19 6.5" />
          </svg>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 15C9 12.1716 9 10.7574 9.87868 9.87868C10.7574 9 12.1716 9 15 9L16 9C18.8284 9 20.2426 9 21.1213 9.87868C22 10.7574 22 12.1716 22 15V16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H15C12.1716 22 10.7574 22 9.87868 21.1213C9 20.2426 9 18.8284 9 16L9 15Z" />
            <path d="M16.9999 9C16.9975 6.04291 16.9528 4.51121 16.092 3.46243C15.9258 3.25989 15.7401 3.07418 15.5376 2.90796C14.4312 2 12.7875 2 9.5 2C6.21252 2 4.56878 2 3.46243 2.90796C3.25989 3.07417 3.07418 3.25989 2.90796 3.46243C2 4.56878 2 6.21252 2 9.5C2 12.7875 2 14.4312 2.90796 15.5376C3.07417 15.7401 3.25989 15.9258 3.46243 16.092C4.51121 16.9528 6.04291 16.9975 9 16.9999" />
          </svg>
        )}
      </button>
      {resolvedLanguage === "bash" ? (
        <code className="whitespace-pre" data-language={resolvedLanguage}>
          {lines.map((line, index) => (
            <span key={`${line}-${index}`}>
              {renderBashLine(line)}
              {index < lines.length - 1 ? "\n" : ""}
            </span>
          ))}
        </code>
      ) : (
        <code
          className="whitespace-pre text-neutral-800"
          data-language={resolvedLanguage}
        >
          {code}
        </code>
      )}
    </>
  );
}
