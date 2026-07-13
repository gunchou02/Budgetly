import axios from "axios";
import { AxiosError } from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8080/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    Accept: "application/json",
  },
});

export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete apiClient.defaults.headers.common.Authorization;
}

interface ApiErrorPayload {
  message?: string;
  errors?: Record<string, string[]>;
}

export function getApiErrorMessage(error: unknown) {
  const requestError = error as AxiosError<ApiErrorPayload>;
  const errors = requestError.response?.data?.errors;

  if (errors) {
    return Object.values(errors).flat().join("\n");
  }

  return requestError.response?.data?.message ?? "通信に失敗しました。";
}
