import axios from "axios";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL, // depois troca pelo seu servidor
});

export default api;