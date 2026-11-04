// server/api/cover/[id].get.ts
// Cover proxy: the browser asks us, we ask VÖBB. Needed because VÖBB only serves covers to its own
// pages (Referer check) and because the visitor's IP must not reach voebb.de (GDPR).
import { defineEventHandler, getQuery, getRouterParam, createError, setHeaders, setResponseStatus, send } from 'h3';
import { fetchCover, coverCacheHeaders } from '../../utils/cover';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? '';
  const size = String(getQuery(event).size ?? 's');

  const result = await fetchCover(id, size);

  if (result.status === 'invalid') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid cover id or size' });
  }

  if (result.status === 'ok') {
    setHeaders(event, { ...coverCacheHeaders('ok'), 'Content-Type': result.contentType });
    return send(event, Buffer.from(result.body));
  }

  setResponseStatus(event, result.status === 'missing' ? 404 : 502);
  setHeaders(event, coverCacheHeaders(result.status));
  return '';
});
