/**
 * Whether a download is in progress on this page. An automatic app update (see PwaUpdatePrompt) waits while this is
 * true, because reloading the page would cut off a download the page is still driving.
 */
let downloadsBusy = false;

export function setDownloadsBusy(busy: boolean): void {
  downloadsBusy = busy;
}

export function isDownloadsBusy(): boolean {
  return downloadsBusy;
}
