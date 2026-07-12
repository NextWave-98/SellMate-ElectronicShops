type LabelSize = 'xsm' | 'sm' | 'md';
type LabelFormat = 'standard' | 'fragile' | 'normal_post';

type FetchLabelMeta = (options: {
  endpoint?: string;
  method?: string;
  silent?: boolean;
  responseType?: 'json' | 'blob' | 'text';
}) => Promise<unknown>;

/**
 * Downloads a freshly rendered label PDF from the API. Labels are generated on
 * each request from current database data (no CDN or DB label cache).
 */
export async function fetchCourierLabelBlob(
  fetchData: FetchLabelMeta,
  shipmentRef: string,
  options: {
    size: LabelSize;
    format: LabelFormat;
    includeOpenNote: boolean;
    action: 'print' | 'download';
  }
): Promise<Blob> {
  const labelIdentifier = encodeURIComponent(shipmentRef);
  const { size, format, includeOpenNote, action } = options;
  const basePath =
    action === 'print'
      ? `/courier/shipments/${labelIdentifier}/label/print`
      : `/courier/shipments/${labelIdentifier}/label`;

  const result = await fetchData({
    endpoint: `${basePath}?size=${size}&format=${format}&includeOpenNote=${includeOpenNote}`,
    method: 'GET',
    silent: true,
    responseType: 'blob',
  });

  if (!(result instanceof Blob)) {
    throw new Error('Failed to fetch label PDF');
  }

  return result;
}
