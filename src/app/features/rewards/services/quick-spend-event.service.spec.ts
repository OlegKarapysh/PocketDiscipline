import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { QuickSpendEventService, QUICK_SPEND_DIALOG_WIDTH } from './quick-spend-event.service';
import { EventBusService } from '../../../core/services/event-bus.service';
import { QuickSpendDialog } from '../components/quick-spend-dialog/quick-spend-dialog';

describe('QuickSpendEventService', () => {
  let service: QuickSpendEventService;
  let eventBus: EventBusService;
  let mockDialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDialog = {
      open: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        QuickSpendEventService,
        EventBusService,
        { provide: MatDialog, useValue: mockDialog },
      ],
    });

    service = TestBed.inject(QuickSpendEventService);
    eventBus = TestBed.inject(EventBusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should open QuickSpendDialog when REQUEST_QUICK_SPEND event is emitted', () => {
    service.initialize();

    eventBus.emit({ type: 'REQUEST_QUICK_SPEND' });

    expect(mockDialog.open).toHaveBeenCalledWith(QuickSpendDialog, {
      width: QUICK_SPEND_DIALOG_WIDTH,
    });
  });

  it('should be idempotent and not create duplicate subscriptions if initialized multiple times', () => {
    service.initialize();
    service.initialize();

    eventBus.emit({ type: 'REQUEST_QUICK_SPEND' });

    expect(mockDialog.open).toHaveBeenCalledTimes(1);
  });

  it('should ignore events once the injector that owns it is destroyed', () => {
    service.initialize();

    TestBed.resetTestingModule();

    eventBus.emit({ type: 'REQUEST_QUICK_SPEND' });

    expect(mockDialog.open).not.toHaveBeenCalled();
  });
});
