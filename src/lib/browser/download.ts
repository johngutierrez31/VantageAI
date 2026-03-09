export function fileNameFromDisposition(disposition: string | null, fallback: string) {
  const match = disposition?.match(/filename="([^"]+)"/i);
  return match?.[1] ?? fallback;
}

export async function downloadResponseBlob(response: Response, fallbackFileName: string) {
  const blob = await response.blob();
  const fileName = fileNameFromDisposition(response.headers.get('content-disposition'), fallbackFileName);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return fileName;
}
