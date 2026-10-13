import DOMPurify from "isomorphic-dompurify";

export function sanitizeAiOutput(rawOutput: string): string {
  return DOMPurify.sanitize(rawOutput, {
    ALLOWED_TAGS: ["p", "b", "i", "em", "strong", "a", "ul", "ol", "li", "code", "pre", "h1", "h2", "h3"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}
