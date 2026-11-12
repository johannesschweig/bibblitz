import { defineEventHandler, getQuery, createError } from 'h3';
import { fetchRecord } from '../utils/recordFetch';

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event);

  if (!id || typeof id !== 'string' || !/^\d+$/.test(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid numeric VÖBB-ID is required.',
    });
  }

  return fetchRecord(id);
});
