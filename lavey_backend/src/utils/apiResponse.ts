import type { ApiResponse } from '../types/api.types.js';

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    data,
    success: true,
    message,
  };
}
