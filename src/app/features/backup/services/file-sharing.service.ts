import { Service } from '@angular/core';
import type { ShareOutcome } from '../models/share-outcome.type';

@Service()
export class FileSharingService {
  canShare(file: File): boolean {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
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
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
