import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileSharingService } from './file-sharing.service';

describe('FileSharingService', () => {
  let service: FileSharingService;
  const file = new File(['backup'], 'backup.txt', { type: 'text/plain' });
  let share: ReturnType<typeof vi.fn<(data: ShareData) => Promise<void>>>;
  let canShare: ReturnType<typeof vi.fn<(data: ShareData) => boolean>>;
  beforeEach(() => {
    share = vi.fn<(data: ShareData) => Promise<void>>();
    canShare = vi.fn<(data: ShareData) => boolean>();
    service = TestBed.inject(FileSharingService);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
  });
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share');
    Reflect.deleteProperty(navigator, 'canShare');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    share.mockReset();
    canShare.mockReset();
  });

  it('returns false when file sharing is unavailable', () => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
    expect(service.canShare(file)).toBe(false);
  });
  it.each([true, false])('reflects the browser file capability: %s', (supported) => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: canShare.mockReturnValue(supported) });
    expect(service.canShare(file)).toBe(supported);
    expect(canShare).toHaveBeenCalledWith({ files: [file] });
  });
  it('uses a default plain-text probe file and returns false if canShare throws', () => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: canShare.mockReturnValue(true) });
    expect(service.canShare()).toBe(true);
    expect(canShare).toHaveBeenCalledWith({ files: [expect.any(File)] });
    canShare.mockImplementation(() => {
      throw new TypeError('Unsupported ShareData');
    });
    expect(service.canShare()).toBe(false);
  });
  it('shares the file', async () => {
    share.mockResolvedValue(undefined);
    await expect(service.share(file)).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({ files: [file] });
  });
  it.each([
    ['AbortError', 'cancelled'],
    ['NotAllowedError', 'needs-tap'],
  ])('maps %s to %s', async (name, outcome) => {
    share.mockRejectedValue(new DOMException('Share rejected', name));
    await expect(service.share(file)).resolves.toBe(outcome);
  });
  it('rethrows other failures', async () => {
    const error = new Error('Share failed');
    share.mockRejectedValue(error);
    await expect(service.share(file)).rejects.toBe(error);
  });
  it('downloads a named file and releases the object URL', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:backup');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    let anchor: { download: string; href: string } | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      anchor = { download: this.download, href: this.href };
    });
    service.download(file);
    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(anchor?.download).toBe(file.name);
    expect(anchor?.href).toBe('blob:backup');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:backup');
  });
});
