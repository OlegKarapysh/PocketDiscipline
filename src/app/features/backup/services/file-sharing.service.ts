import { DOCUMENT } from '@angular/common';
import { Service, inject } from '@angular/core';
import type { ShareOutcome } from '../models/share-outcome.type';

// Firefox and Safari start a download after the click returns, so the URL must outlive the click.
const OBJECT_URL_LIFETIME_MS = 60_000;

@Service()
export class FileSharingService {
  private readonly document = inject(DOCUMENT);

  canShare(file = new File([], 'pocket-discipline-2000-01-01-0000.txt', { type: 'text/plain' })): boolean {
    try {
      return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  }

  async share(file: File): Promise<ShareOutcome> {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        return 'needs-tap';
      }
      throw error;
    }
  }

  download(file: File): void {
    const url = URL.createObjectURL(file);
    try {
      const anchor = this.document.createElement('a');
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
    } finally {
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, OBJECT_URL_LIFETIME_MS);
    }
  }
}
