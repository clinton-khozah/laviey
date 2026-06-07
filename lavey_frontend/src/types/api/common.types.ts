/** Standard API envelope from the .NET backend */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}
