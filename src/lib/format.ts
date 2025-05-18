/**
 * Format bytes to human readable size
 * @param bytes Number of bytes
 * @param decimals Number of decimal places to show
 * @returns Formatted string (e.g., "1.5 KB" or "15.4 MB")
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  // Ensure we get a non-negative index
  const i = Math.max(0, Math.floor(Math.log(Math.abs(bytes)) / Math.log(k)));
  const index = Math.min(i, sizes.length - 1);

  return parseFloat((bytes / Math.pow(k, index)).toFixed(dm)) + ' ' + sizes[index];
} 