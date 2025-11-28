/**
 * Export post to various formats
 */

export const exportToMarkdown = (post) => {
  const frontMatter = `---
title: ${post.title}
author: ${post.author?.username || 'Unknown'}
date: ${post.publishedAt || post.createdAt}
category: ${post.category?.name || ''}
tags: ${Array.isArray(post.tags) ? post.tags.join(', ') : ''}
excerpt: ${post.excerpt || ''}
---

`;

  // Convert HTML to Markdown if needed
  const content = post.content || '';
  const isHTML = /<[a-z][\s\S]*>/i.test(content);
  
  let markdownContent = content;
  if (isHTML) {
    // Simple HTML to Markdown conversion
    markdownContent = content
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  return frontMatter + markdownContent;
};

export const exportToPDF = async (post) => {
  // This would require a PDF library like jsPDF or html2pdf
  // For now, we'll use the browser's print functionality
  const printWindow = window.open('', '_blank');
  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${post.title}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
          .content { line-height: 1.6; }
        </style>
      </head>
      <body>
        <h1>${post.title}</h1>
        <div class="meta">
          By ${post.author?.username || 'Unknown'} | 
          ${post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ''}
        </div>
        <div class="content">${post.content}</div>
      </body>
    </html>
  `;
  printWindow.document.write(content);
  printWindow.document.close();
  printWindow.print();
};

export const exportToJSON = (post) => {
  return JSON.stringify({
    title: post.title,
    author: post.author,
    content: post.content,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  }, null, 2);
};

export const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportPost = (post, format = 'markdown') => {
  const sanitizedTitle = post.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const timestamp = new Date().toISOString().split('T')[0];

  switch (format) {
    case 'markdown': {
      const markdown = exportToMarkdown(post);
      downloadFile(markdown, `${sanitizedTitle}-${timestamp}.md`, 'text/markdown');
      break;
    }
    case 'json': {
      const json = exportToJSON(post);
      downloadFile(json, `${sanitizedTitle}-${timestamp}.json`, 'application/json');
      break;
    }
    case 'pdf':
      exportToPDF(post);
      break;
    default:
      console.error('Unsupported export format:', format);
  }
};

