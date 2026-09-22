export function appBasePath() {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

export function roomPath(slug) {
  return `${appBasePath()}/help/${encodeURIComponent(slug)}`;
}

export function absoluteRoomUrl(slug) {
  if (typeof window === "undefined") return roomPath(slug);
  return `${window.location.origin}${roomPath(slug)}`;
}
