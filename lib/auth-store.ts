"use client";

import { useSyncExternalStore } from "react";

export type AuthSnapshot = {
  isAuthenticated: boolean;
  token: string | null;
  userId: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
};

const EMPTY_AUTH_SNAPSHOT: AuthSnapshot = Object.freeze({
  isAuthenticated: false,
  token: null,
  userId: null,
  username: null,
  firstName: null,
  lastName: null,
});

let cachedSnapshot = EMPTY_AUTH_SNAPSHOT;

function readAuthSnapshot(): AuthSnapshot {
  if (typeof window === "undefined") {
    return EMPTY_AUTH_SNAPSHOT;
  }

  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username");
  const firstName = localStorage.getItem("firstName");
  const lastName = localStorage.getItem("lastName");
  const isAuthenticated = !!token;

  if (
    cachedSnapshot.token === token &&
    cachedSnapshot.userId === userId &&
    cachedSnapshot.username === username &&
    cachedSnapshot.firstName === firstName &&
    cachedSnapshot.lastName === lastName &&
    cachedSnapshot.isAuthenticated === isAuthenticated
  ) {
    return cachedSnapshot;
  }

  cachedSnapshot = {
    isAuthenticated,
    token,
    userId,
    username,
    firstName,
    lastName,
  };

  return cachedSnapshot;
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => callback();

  window.addEventListener("storage", handleChange);
  window.addEventListener("focus", handleChange);
  window.addEventListener("fithub-auth-change", handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener("focus", handleChange);
    window.removeEventListener("fithub-auth-change", handleChange);
  };
}

export function notifyAuthStoreChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("fithub-auth-change"));
}

export function useAuthSnapshot() {
  return useSyncExternalStore(subscribe, readAuthSnapshot, () => EMPTY_AUTH_SNAPSHOT);
}
