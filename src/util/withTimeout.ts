/**
 * Races `promise` against a timer, rejecting with `message` if the timer
 * wins. Needed because a blocked CDN `<script>` tag (e.g. a browser
 * extension or corporate CSP enforcing `script-src-elem 'none'`) doesn't
 * always produce a JS error at all — some browsers never fire the script
 * element's `error` event for a CSP-blocked load, which otherwise leaves
 * `loadSqlJs()`/`loadPyodideFromCdn()` pending forever and the boot banner
 * stuck on "wird geladen" with no way for the user to tell what's wrong.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
