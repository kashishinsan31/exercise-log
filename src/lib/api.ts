export const apiFetch = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const errorText = await res.text();
    // If it looks like HTML, it's likely a static routing fallback (e.g. Netlify)
    if (errorText.trim().startsWith("<!DOCTYPE") || errorText.trim().startsWith("<html")) {
      throw new Error(
        "Backend server is not running. It appears the app is hosted as a static site (e.g., Netlify). This full-stack application requires a Node.js/Express environment to securely proxy Google Sheets API requests."
      );
    }
    throw new Error(`Unexpected non-JSON response from server (Content-Type: ${contentType}).`);
  }
  
  return res;
};
