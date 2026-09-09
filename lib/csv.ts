export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: { key: keyof T; label: string }[]
) {
  if (!data || !data.length) return;

  // 1. Determine columns and headers
  const keys = headers ? headers.map((h) => h.key) : (Object.keys(data[0]) as (keyof T)[]);
  const headerRow = headers ? headers.map((h) => h.label) : keys.map(String);

  // 2. Map data rows and handle special characters (commas, quotes, newlines)
  const rows = data.map((row) =>
    keys
      .map((key) => {
        const val = row[key];
        if (val === null || val === undefined) return '""';
        const strVal = String(val).replace(/"/g, '""'); // Escape inner double quotes
        return `"${strVal}"`;
      })
      .join(',')
  );

  // 3. Combine header and data rows
  const csvContent = [headerRow.join(','), ...rows].join('\n');

  // 4. Create Blob and download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
