// This URL is public deployment configuration. Never put provider keys here.
const base=(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'');
export const apiUrl=path=>base+path;
