import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8081/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

export function setAuthToken(token) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete apiClient.defaults.headers.common.Authorization;
}

export function getApiErrorMessage(error) {
  const errors = error.response?.data?.errors;

  if (errors) {
    return Object.values(errors).flat().join("\n");
  }

  return error.response?.data?.message ?? "通信に失敗しました。";
}
