// Allowed HTML tags after markdown conversion — everything else is stripped.
const ALLOWED_TAGS = new Set([
  "pre", "code", "strong", "em", "h2", "h3", "li", "ul", "br", "a",
]);

/**
 * Strip any HTML tags / attributes that are NOT in the allow-list.
 * This acts as defence-in-depth on top of the entity escaping below.
 */
function sanitizeHtml(html: string): string {
  // Remove all tags that are not in the allow-list
  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    const lower = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(lower)) return "";
    // For allowed tags, strip event-handler attributes (on*)
    return match.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  });
}

// Lightweight markdown to HTML converter for chat messages
// Supports: **bold**, *italic*, `code`, ```code blocks```, - lists, ## headers, [links](url)
export function renderMarkdown(text: string): string {
  let html = text
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Code blocks (must be before inline code)
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-[#0C1220] rounded-lg p-3 my-2 text-xs overflow-x-auto"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-[#0C1220] px-1.5 py-0.5 rounded text-xs text-brand-300">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[#F4F1ED]">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="font-semibold text-sm mt-3 mb-1 text-[#F4F1ED]">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-semibold text-base mt-3 mb-1 text-[#F4F1ED]">$1</h2>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^• (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Line breaks (but not inside pre blocks)
    .replace(/\n/g, '<br/>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*?<\/li><br\/>?)+)/g, (match) => {
    return '<ul class="my-1 space-y-0.5">' + match.replace(/<br\/>/g, '') + '</ul>';
  });

  return sanitizeHtml(html);
}
