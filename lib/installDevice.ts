export type InstallDevice = "iphone" | "android" | "desktop";

export function installDevice(userAgent: string, touchPoints = 0): InstallDevice {
  if (/iPad|iPhone|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1)) return "iphone";
  return /Android/i.test(userAgent) ? "android" : "desktop";
}
