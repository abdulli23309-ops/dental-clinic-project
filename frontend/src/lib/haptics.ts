export const tap = (ms = 8) => {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(ms);
    } catch {
      // Ignore vibration errors if blocked by browser policy
    }
  }
};
