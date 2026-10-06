import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { QuickSpendEventService } from './quick-spend-event.service';
import { EventBusService } from '../../../core/services/event-bus.service';
import { SnackBarService } from '../../../shared/services/snack-bar.service';
import { QuickSpendDialog } from '../components/quick-spend-dialog/quick-spend-dialog';

describe('QuickSpendEventService', () => {
  let service: QuickSpendEventService;
  let eventBus: EventBusService;
  let mockDialog: { open: ReturnType<typeof vi.fn> };
  let mockSnackBar: { show: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDialog = {
      open: vi.fn(),
    };
    mockSnackBar = {
      show: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        QuickSpendEventService,
        EventBusService,
        { provide: MatDialog, useValue: mockDialog },
        { provide: SnackBarService, useValue: mockSnackBar },
      ],
    });

    service = TestBed.inject(QuickSpendEventService);
    eventBus = TestBed.inject(EventBusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should open QuickSpendDialog when REQUEST_QUICK_SPEND event is emitted', async () => {
    service.initialize();

    eventBus.emit({ type: 'REQUEST_QUICK_SPEND' });

    await vi.waitFor(() => {
      expect(mockDialog.open).toHaveBeenCalledWith(QuickSpendDialog, expect.anything());
    });
  });

  it('should tell the user when the dialog cannot be opened', async () => {
    mockDialog.open.mockImplementation(() => {
      throw new Error('chunk failed');
    });
    service.initialize();

    eventBus.emit({ type: 'REQUEST_QUICK_SPEND' });

    await vi.waitFor(() => {
      expect(mockSnackBar.show).toHaveBeenCalledTimes(1);
    });
  });

  it('should be idempotent and not create duplicate subscriptions if initialized multiple times', async () => {
    service.initialize();
    service.initialize();

    eventBus.emit({ type: 'REQUEST_QUICK_SPEND' });

    await vi.waitFor(() => {
      expect(mockDialog.open).toHaveBeenCalled();
    });
    expect(mockDialog.open).toHaveBeenCalledTimes(1);
  });

  it('should ignore events once the injector that owns it is destroyed', async () => {
    service.initialize();

    TestBed.resetTestingModule();

    eventBus.emit({ type: 'REQUEST_QUICK_SPEND' });

    await import('../components/quick-spend-dialog/quick-spend-dialog');
    expect(mockDialog.open).not.toHaveBeenCalled();
  });
});
