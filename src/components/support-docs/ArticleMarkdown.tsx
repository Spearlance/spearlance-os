import { useState, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Flatten a React node tree down to its raw text (for clipboard copy). */
function nodeToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (isValidElement(node)) {
    return nodeToText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

/**
 * Renders a fenced code block with a copy button. react-markdown only emits
 * <pre> for fenced/indented code blocks (never for inline code), so overriding
 * <pre> is the correct signal for "this is a copyable block" — which is exactly
 * the kickoff-prompt interaction the SOP library is built around.
 */
function CopyableCodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const code = nodeToText(children).replace(/\n$/, "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. non-secure context) — silently no-op.
    }
  };

  return (
    <div className="group relative my-4">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy to clipboard"}
        className={cn(
          "absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border px-2 py-1",
          "text-xs font-medium transition-colors",
          "border-white/20 bg-white/10 text-white/90 hover:bg-white/20",
        )}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto">{children}</pre>
    </div>
  );
}

interface ArticleMarkdownProps {
  content: string;
  /** Extra classes on the prose wrapper (e.g. "prose-lg", "prose-sm"). */
  className?: string;
  /** Text direction — set "rtl" for right-to-left languages like Urdu. */
  dir?: "ltr" | "rtl";
}

/**
 * Shared Markdown renderer for support articles and internal SOPs. Adds GFM
 * (tables, task lists, strikethrough, autolinks) and copyable code blocks.
 * Used by both the article reader and the admin editor preview so authors see
 * copy buttons exactly as readers will.
 */
export function ArticleMarkdown({ content, className, dir }: ArticleMarkdownProps) {
  return (
    <div className={cn("prose max-w-none", className)} dir={dir}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <CopyableCodeBlock>{children}</CopyableCodeBlock>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
