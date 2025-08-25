import { Component, OnInit, ViewEncapsulation, OnDestroy, ChangeDetectorRef, AfterViewChecked, NgZone, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription, BehaviorSubject, combineLatest, of } from 'rxjs';
import { filter, map, switchMap, mergeMap, take } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { get, set, indexOf, first, sum, cloneDeep, isNil, map as _map, join, split, trim } from 'lodash';
import {
  Order, OrderLineItem, OrderService, UserService,
  ItemGroup, LineItemService, Note, NoteService, EmailService, AccountService,
  Contact, Cart, Account, ContactService, QuoteService, AttachmentDetails, AttachmentService, ProductInformationService
} from '@congarevenuecloud/ecommerce';
import { ExceptionService, LookupOptions, FileOutput } from '@congarevenuecloud/elements';
@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class OrderDetailComponent implements OnInit, OnDestroy, AfterViewChecked {

  order$: BehaviorSubject<Order> = new BehaviorSubject<Order>(null);
  orderLineItems$: BehaviorSubject<Array<ItemGroup>> = new BehaviorSubject<Array<ItemGroup>>(null);
  noteList$: BehaviorSubject<Array<Note>> = new BehaviorSubject<Array<Note>>(null);
  attachmentList$: BehaviorSubject<Array<AttachmentDetails>> = new BehaviorSubject<Array<AttachmentDetails>>(null);

  noteSubscription: Subscription;
  orderSubscription: Subscription;
  attachemntSubscription: Subscription;

  @ViewChild('attachmentSection') attachmentSection: ElementRef;
  @ViewChild('fileInput') fileInput: ElementRef;

  private subscriptions: Subscription[] = [];
  isLoggedIn$: Observable<boolean>;
  order: Order;

  orderStatusSteps: Array<string> = [
    'STATUS.DRAFT',
    'STATUS.GENERATED',
    'STATUS.PRESENTED',
    'STATUS.CONFIRMED',
    'STATUS.IN_FULFILLMENT',
    'STATUS.FULFILLED',
    'STATUS.ACTIVATED'
  ];

  orderStatusMap: Record<string, { Key: string; DisplayText: string }> = {
    'Draft': { 'Key': 'Draft', 'DisplayText': 'STATUS.DRAFT' },
    'Confirmed': { 'Key': 'Confirmed', 'DisplayText': 'STATUS.CONFIRMED' },
    'Processing': { 'Key': 'Processing', 'DisplayText': 'STATUS.GENERATED' },
    'In Fulfillment': { 'Key': 'In Fulfillment', 'DisplayText': 'STATUS.IN_FULFILLMENT' },
    'Partially Fulfilled': { 'Key': 'Partially Fulfilled', 'DisplayText': 'STATUS.PARTIALLY_FULFILLED' },
    'Fulfilled': { 'Key': 'Fulfilled', 'DisplayText': 'STATUS.FULFILLED' },
    'Activated': { 'Key': 'Activated', 'DisplayText': 'STATUS.ACTIVATED' },
    'In Amendment': { 'Key': 'In Amendment', 'DisplayText': 'STATUS.DRAFT' },
    'Being Amended': { 'Key': 'Being Amended', 'DisplayText': 'STATUS.DRAFT' },
    'Superseded': { 'Key': 'Superseded', 'DisplayText': 'STATUS.DRAFT' },
    'Generated': { 'Key': 'Generated', 'DisplayText': 'STATUS.GENERATED' },
    'Presented': { 'Key': 'Presented', 'DisplayText': 'STATUS.PRESENTED' }
  };

  isLoading: boolean = false;

  note: Note = new Note();

  commentsLoader: boolean = false;

  lineItemLoader: boolean = false;

  attachmentsLoader = false;

  ShipToAddress: Account;

  orderConfirmation: Order

  supportedFileTypes: string;

  showPresentTemplate = false;


  lookupOptions: LookupOptions = {
    primaryTextField: 'Name',
    secondaryTextField: 'Email',
    fieldList: ['Name', 'Id', 'Email']
  };

  isPrivate: boolean = false;
  maxFileSizeLimit = 29360128;
  cartRecord: Cart = new Cart();
  // Flag used to toggle the content visibility when the list of fields exceeds two rows of the summary with show more or show less icon
  isExpanded: boolean = false;

  orderStatusLabelMap: Record<string, string> = {};
  orderStatusStepsLabels: Array<string> = [];

  constructor(private activatedRoute: ActivatedRoute,
    private orderService: OrderService,
    private userService: UserService,
    private exceptionService: ExceptionService,
    private noteService: NoteService,
    private router: Router,
    private emailService: EmailService,
    private accountService: AccountService,
    private cdr: ChangeDetectorRef,
    private quoteService: QuoteService,
    private contactService: ContactService,
    private attachmentService: AttachmentService,
    private productInformationService: ProductInformationService,
    private ngZone: NgZone,
    private translateService: TranslateService) { }

  ngOnInit() {
    this.isLoggedIn$ = this.userService.isLoggedIn();
    this.getOrder();
    this.subscriptions.push(this.accountService.getCurrentAccount().subscribe(account => {
      this.lookupOptions.expressionOperator = 'AND';
      this.lookupOptions.filters = null;
      this.lookupOptions.sortOrder = null;
      this.lookupOptions.page = 10;
    }));
    this.subscriptions.push(this.attachmentService.getSupportedAttachmentType().pipe(
      take(1)
    ).subscribe((data: string) => {
      this.supportedFileTypes = join(_map(split(data, ','), (item) => trim(item)), ', ');
    }))
    this.subscriptions.push(
      this.translateService.stream(this.orderStatusSteps).subscribe((translations) => {
        this.orderStatusStepsLabels = this.orderStatusSteps.map(
          (key) => translations[key]
        );
      })
    );
    this.translateOrderStatusLabels(this.orderStatusMap);
  }

  getOrder() {
    if (this.orderSubscription) this.orderSubscription.unsubscribe();

    const order$ = this.activatedRoute.params
      .pipe(
        filter(params => get(params, 'id') != null),
        map(params => get(params, 'id')),
        mergeMap(orderId => this.orderService.getOrder(orderId)),
        switchMap((order: Order) => {
          return this.updateOrderValue(order)
        })
      );

    this.orderSubscription = order$
      .pipe(
        switchMap(order => {
          if (isNil(order)) return of(null);
    
          if (order?.Status === 'Partially Fulfilled' && indexOf(this.orderStatusSteps, 'STATUS.FULFILLED') > 0) {
            this.orderStatusSteps[indexOf(this.orderStatusSteps, 'STATUS.FULFILLED')] = 'STATUS.PARTIALLY_FULFILLED';
          }
    
          if (order?.Status === 'Fulfilled' && indexOf(this.orderStatusSteps, 'STATUS.PARTIALLY_FULFILLED') > 0) {
            this.orderStatusSteps[indexOf(this.orderStatusSteps, 'STATUS.PARTIALLY_FULFILLED')] = 'Fulfilled';
          }

          order.OrderLineItems = get(order, 'OrderLineItems');
          this.orderLineItems$.next(LineItemService.groupItems(order.OrderLineItems));
    
          set(this.cartRecord, 'Id', get(get(first(this.orderLineItems$.value), 'MainLine.Configuration'), 'Id'));
          this.cartRecord.BusinessObjectType = 'Order';
    
          return of(order);
        }),
        take(1)
      )
      .subscribe(order => {
        if (order) {
          this.updateOrder(order);
        }
      });
    this.getAttachments();
  }

  refreshOrder(fieldValue, order, fieldName) {
    set(order, fieldName, fieldValue);
    const orderItems = get(order, 'OrderLineItems');
    const payload: Order = {
      'PrimaryContact': order.PrimaryContact,
      'Description': order.Description,
      'ShipToAccount': order.ShipToAccount,
      'BillToAccount': order.BillToAccount
    } as Order;
    this.orderService.updateOrder(order.Id, payload).pipe(switchMap(c => this.updateOrderValue(c))).subscribe(r => {
      set(r, 'OrderLineItems', orderItems);
      this.updateOrder(r);
    });
  }

  updateOrderValue(order: Order): Observable<Order> {
    return this.orderService.updateOrderValue(order).pipe(
      take(1),
      map((updatedOrder: Order) => {
        this.order = updatedOrder;
        return updatedOrder;
      })
    );
  }

  editOrderItems(order: Order) {
    this.lineItemLoader = true;
    this.orderService.convertOrderToCart(order).pipe(take(1)).subscribe(value => {
      set(value, 'Order', this.order);
      this.ngZone.run(() => this.router.navigate(['/carts', 'active']));
    },
      err => {
        this.exceptionService.showError(err);
        this.lineItemLoader = false;
      })
  }

  updateOrder(order) {
    this.ngZone.run(() => this.order$.next(cloneDeep(order)));
  }

  getTotalPromotions(orderLineItems: Array<OrderLineItem> = []): number {
    return orderLineItems.length ? sum(orderLineItems.map(res => res.IncentiveAdjustmentAmount)) : 0;
  }

  getChildItems(orderLineItems: Array<OrderLineItem>, lineItem: OrderLineItem): Array<OrderLineItem> {
    return orderLineItems.filter(orderItem => !orderItem.IsPrimaryLine && orderItem.PrimaryLineNumber === lineItem.PrimaryLineNumber);
  }

  confirmOrder(orderId: string, primaryContactId: string) {
    this.isLoading = true;
    this.subscriptions.push(combineLatest([this.orderService.acceptOrder(orderId), this.emailService.getEmailTemplateByName('DC Order Confirmation Template')]).pipe(
      switchMap(([res, templateInfo]) => {
        this.isLoading = false;
        if (res) {
          this.exceptionService.showSuccess('ACTION_BAR.ORDER_CONFIRMATION_TOASTR_MESSAGE', 'ACTION_BAR.ORDER_CONFIRMATION_TOASTR_TITLE');
        }
        else {
          this.exceptionService.showError('ACTION_BAR.ORDER_CONFIRMATION_FAILURE');
        }
        return templateInfo ? this.emailService.sendEmailNotificationWithTemplate(get(templateInfo, 'Id'), this.order, primaryContactId) : of(null);
      })
    ).subscribe(() => {
      this.getOrder();
    }))
  }

  onGenerateOrder() {
    if (this.attachmentSection) this.attachmentSection.nativeElement.scrollIntoView({ behavior: 'smooth' });
    let obsv$;
    if (get(this.order, 'Status') == 'Draft') {
      const payload = { 'Status': 'Generated' };
      obsv$ = this.orderService.updateOrder(this.order.Id, payload as Order);
    } else {
      obsv$ = of(null);
    }

    combineLatest([this.emailService.getEmailTemplateByName('DC Order generate-document Template'), obsv$]).pipe(
      switchMap(result => {
        return first(result) ? this.emailService.sendEmailNotificationWithTemplate(get(first(result), 'Id'), this.order, get(this.order.PrimaryContact, 'Id')) : of(null)
      }), take(1)).subscribe(() => { this.getOrder() });
  }

  openPresentOrderPage() {
    this.showPresentTemplate = true;
  }

  onPresentDoc(obj: any) {
    this.showPresentTemplate = !(obj.onDocumentPage);

    if (obj.isPresentDocCompleted) {
      let obsv$;
      if (get(this.order, 'Status') != 'Presented') {
        const payload = { 'Status': 'Presented' };
        obsv$ = this.orderService.updateOrder(this.order.Id, payload as Order);
      } else {
        obsv$ = of(null);
      }
      obsv$.pipe(take(1)).subscribe(() => {
        this.getOrder();
      })
    }
  }

  addComment(orderId: string) {
    this.commentsLoader = true;
    set(this.note, 'ParentId', orderId);
    set(this.note, 'OwnerId', get(this.userService.me(), 'Id'));
    if (!this.note.Name) {
      set(this.note, 'Name', 'Notes Title');
    }
    this.noteService.create([this.note])
      .subscribe(r => {
        this.clear();
        this.commentsLoader = false;
      },
        err => {
          this.exceptionService.showError(err);
          this.commentsLoader = false;
        });
  }

  deleteAttachment(attachment: AttachmentDetails) {
    attachment.DocumentMetadata.set('deleting', true);
    this.attachmentService.deleteAttachment(attachment.DocumentMetadata.DocumentId).pipe(take(1)).subscribe(() => {
      attachment.DocumentMetadata.set('deleting', false);
      this.getAttachments();
    })
  }

  clear() {
    set(this.note, 'Body', null);
    set(this.note, 'Title', null);
    set(this.note, 'Id', null);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());

    if (this.orderSubscription) {
      this.orderSubscription.unsubscribe();
    }

    if (this.noteSubscription) {
      this.noteSubscription.unsubscribe();
    }
  }

  ngAfterViewChecked() {
    this.cdr.detectChanges();
  }

  getAttachments() {
    if (this.attachemntSubscription) this.attachemntSubscription.unsubscribe();
    this.attachemntSubscription = this.activatedRoute.params
      .pipe(
        switchMap(params => this.attachmentService.getAttachments(get(params, 'id'), 'order'))
      ).subscribe((attachments: Array<AttachmentDetails>) => this.ngZone.run(() => this.attachmentList$.next(attachments)));
  }

  uploadAttachments(fileInput: FileOutput) {
    this.attachmentsLoader = true;
    const fileList = fileInput.files;
    this.isPrivate = fileInput.visibility;
    // To control the visibility of files, pass the additional field "IsPrivate_c" as part of the customProperties when calling uploadMultipleAttachments.
    // You must include "IsPrivate_c" or any other custom fields passed as method parameters to the DocumentMetadata object. For more details, please refer to SDK/product documentation.
    this.attachmentService.uploadMultipleAttachments(fileList, this.order.Id, 'Order', {
      IsPrivate_c: this.isPrivate
    }).pipe(take(1)).subscribe(res => {
      this.getAttachments();
      this.attachmentsLoader = false;
      this.cdr.detectChanges();
    }, err => {
      this.exceptionService.showError(err);
    });
  }

  downloadAttachment(attachmentId: string) {
    this.productInformationService.getAttachmentUrl(attachmentId).pipe(take(1)).subscribe((url: string) => {
      window.open(url, '_blank');
    });
  }

  private translateOrderStatusLabels(statusMap: Record<string, { Key: string; DisplayText: string }>): void {
    this.subscriptions.push(
      this.translateService.stream(
        Object.values(statusMap).map(status => status.DisplayText)
      ).subscribe(translations => {
        this.orderStatusLabelMap = Object.fromEntries(
          Object.entries(statusMap).map(([statusKey, status]) => [
            statusKey,
            translations[status.DisplayText]
          ])
        );
      })
    );
  }
}
