import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { QuickSpendEventService, QUICK_SPEND_DIALOG_WIDTH } from './quick-spend-event.service';
import { EventBusService } from '../../../core/services/event-bus.service';
import { QuickSpendDialogComponent } from '../components/quick-spend-dialog/quick-spend-dialog';

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

  it('should open QuickSpendDialogComponent when REQUEST_QUICK_SPEND event is emitted', () => {
    service.initialize();

    eventBus.emit({ type: 'REQUEST_QUICK_SPEND' });

    expect(mockDialog.open).toHaveBeenCalledWith(QuickSpendDialogComponent, {
      width: QUICK_SPEND_DIALOG_WIDTH,
    });
  });

  it('should be idempotent and not create duplicate subscriptions if initialized multiple times', () => {
    service.initialize();
    service.initialize();

    eventBus.emit({ type: 'REQUEST_QUICK_SPEND' });

    expect(mockDialog.open).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe on ngOnDestroy and ignore subsequent events', () => {
    service.initialize();
    service.ngOnDestroy();

    eventBus.emit({ type: 'REQUEST_QUICK_SPEND' });

    expect(mockDialog.open).not.toHaveBeenCalled();
  });
});
