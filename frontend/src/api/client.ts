import axios from "axios";
import { AxiosError } from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

interface ApiErrorPayload {
  message?: string;
  errors?: Record<string, string[]>;
}

export function getApiErrorMessage(error: unknown) {
  const requestError = error as AxiosError<ApiErrorPayload>;
  const errors = requestError.response?.data?.errors;

  if (requestError.response?.status === 413) {
    return "画像サイズは5MB以下にしてください。";
  }

  if (errors) {
    return Object.values(errors).flat().join("\n");
  }

  return requestError.response?.data?.message ?? "通信に失敗しました。";
}
