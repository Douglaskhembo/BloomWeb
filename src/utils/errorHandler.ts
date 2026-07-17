export const getBackendErrorMessage = (
  error: any,
  fallback = "Failed to process the request. Please try again."
): string => {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  return data?.message || data?.error || data?.detail || error?.message || fallback;
};
