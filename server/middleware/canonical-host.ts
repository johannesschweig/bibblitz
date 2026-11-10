// The bare domain redirects to www, as Vercel's domain setting did, so search engines keep one URL per page
import { defineEventHandler, getRequestHost, getRequestURL, sendRedirect } from 'h3';

export default defineEventHandler((event) => {
  if (getRequestHost(event, { xForwardedHost: true }) !== 'bibblitz.de') return;
  const url = getRequestURL(event);
  return sendRedirect(event, `https://www.bibblitz.de${url.pathname}${url.search}`, 308);
});
