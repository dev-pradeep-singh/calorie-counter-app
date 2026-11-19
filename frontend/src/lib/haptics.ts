/** Light haptic tap where supported (Android Chrome). iOS Safari ignores it silently. */
export function haptic(pattern: number | number[] = 10) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* unsupported */
  }
}
