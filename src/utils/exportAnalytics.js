/**
 * Export analytics data to various formats
 */

/**
 * Export data to CSV format
 */
export const exportToCSV = (data, filename = 'analytics') => {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Handle values with commas, quotes, or newlines
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export data to JSON format
 */
export const exportToJSON = (data, filename = 'analytics') => {
  if (!data) {
    console.error('No data to export');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export data to Excel format (CSV with Excel-compatible formatting)
 */
export const exportToExcel = (data, filename = 'analytics') => {
  // Excel can read CSV, but we'll add BOM for UTF-8 support
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Format analytics data for export
 */
export const formatAnalyticsForExport = (analytics) => {
  const formatted = [];

  // Posts analytics
  if (analytics.posts) {
    analytics.posts.forEach(post => {
      formatted.push({
        Type: 'Post',
        Title: post.title,
        'Created At': new Date(post.createdAt).toLocaleString(),
        Views: post.views || 0,
        Likes: post.likes?.length || 0,
        Comments: post.comments?.length || 0,
        Shares: post.shares || 0,
        Status: post.status,
        Author: post.author?.username || 'Unknown',
        Category: post.category?.name || 'Uncategorized',
      });
    });
  }

  // User analytics
  if (analytics.users) {
    analytics.users.forEach(user => {
      formatted.push({
        Type: 'User',
        Username: user.username,
        Email: user.email,
        Role: user.role,
        'Created At': new Date(user.createdAt).toLocaleString(),
        'Posts Count': user.postsCount || 0,
        Status: user.isActive ? 'Active' : 'Inactive',
      });
    });
  }

  // Category analytics
  if (analytics.categories) {
    analytics.categories.forEach(category => {
      formatted.push({
        Type: 'Category',
        Name: category.name,
        'Posts Count': category.postsCount || 0,
        'Created At': new Date(category.createdAt).toLocaleString(),
      });
    });
  }

  return formatted;
};

export default {
  exportToCSV,
  exportToJSON,
  exportToExcel,
  formatAnalyticsForExport,
};

