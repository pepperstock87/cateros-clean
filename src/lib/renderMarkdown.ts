// Lightweight markdown to HTML converter for chat messages
// Supports: **bold**, *italic*, `code`, ```code blocks```, - lists, ## headers, [links](url)
export function renderMarkdown(text: string): string {
  let html = text
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Code blocks (must be before inline code)
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-[#0f0d0b] rounded-lg p-3 my-2 text-xs overflow-x-auto"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-[#0f0d0b] px-1.5 py-0.5 rounded text-xs text-brand-300">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[#f5ede0]">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="font-semibold text-sm mt-3 mb-1 text-[#f5ede0]">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-semibold text-base mt-3 mb-1 text-[#f5ede0]">$1</h2>')
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

  return html;
}
