import { Component, OnInit, ViewEncapsulation, OnDestroy, ChangeDetectorRef, AfterViewChecked, NgZone, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription, BehaviorSubject, combineLatest, of } from 'rxjs';
import { filter, map, switchMap, mergeMap, take, catchError } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { get, set, indexOf, first, sum, cloneDeep, isNil, map as _map, join, split, trim, values, last } from 'lodash';
import { AObject } from '@congarevenuecloud/core';
import {
  Order, OrderLineItem, OrderService, UserService,
  ItemGroup, LineItemService, EmailService, AccountService,
  Contact, Cart, Account, AttachmentDetails, AttachmentService, ProductInformationService, StorefrontService, DetailActionArea, DetailActionSection, DetailActionSet, DetailAction, DisplayColumn, DisplayColumnSection
} from '@congarevenuecloud/ecommerce';
import { ExceptionService, LookupOptions, FileOutput, DisplayColumnService, CartItemView } from '@congarevenuecloud/elements';
import { DEFAULT_DETAIL_ACTIONS } from '../../../services/detail-actions.config';
@Component({
    selector: 'app-order-detail',
    templateUrl: './order-detail.component.html',
    styleUrls: ['./order-detail.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class OrderDetailComponent implements OnInit, OnDestroy, AfterViewChecked {

  order$: BehaviorSubject<Order> = new BehaviorSubject<Order>(null);
  orderLineItems$: BehaviorSubject<Array<ItemGroup>> = new BehaviorSubject<Array<ItemGroup>>(null);
  attachmentList$: BehaviorSubject<Array<AttachmentDetails>> = new BehaviorSubject<Array<AttachmentDetails>>(null);

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

  lineItemLoader: boolean = false;

  attachmentsLoader = false;

  ShipToAddress: Account;

  orderConfirmation: Order

  supportedFileTypes: string;

  showPresentTemplate = false;

  isPrivate: boolean = false;
  maxFileSizeLimit = 29360128;
  cartRecord: Cart = new Cart();
  // Flag used to toggle the content visibility when the list of fields exceeds two rows of the summary with show more or show less icon
  isExpanded: boolean = false;

  orderStatusLabelMap: Record<string, string> = {};
  orderStatusStepsLabels: Array<string> = [];

  // Action configuration from the displayActions API, falling back to the built-in defaults.
  actions: DetailActionSet = new DetailActionSet(DetailActionSection.Order, DEFAULT_DETAIL_ACTIONS, () => ({
    stage: get(this.order, 'Status'),
    isLoggedIn: true
  }));

  // Placement buckets exposed to the template.
  readonly actionArea = DetailActionArea;

  // Order summary fields from the displayColumns API; empty keeps the built-in summary layout.
  orderColumns: Array<DisplayColumn> = [];

  // Order line item fields from the displayColumns API; null keeps the user's Edit Layout selection.
  orderLineItemColumns: Array<CartItemView> = null;

  // Line item price rows from the displayColumns API; null keeps the built-in price rows.
  priceColumns: Array<DisplayColumn> = null;

  constructor(private activatedRoute: ActivatedRoute,
    private orderService: OrderService,
    private userService: UserService,
    private exceptionService: ExceptionService,
    private router: Router,
    private emailService: EmailService,
    private cdr: ChangeDetectorRef,
    private attachmentService: AttachmentService,
    private productInformationService: ProductInformationService,
    private ngZone: NgZone,
    private translateService: TranslateService,
    private storefrontService: StorefrontService, private displayColumnService: DisplayColumnService) { }

  ngOnInit() {
    this.isLoggedIn$ = this.userService.isLoggedIn();
    this.loadDisplayActions();
    this.subscriptions.push(this.activatedRoute.params.pipe(
      filter(params => get(params, 'id') != null)
    ).subscribe(() => this.getOrder()));
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
          set(this.cartRecord, 'SalesTaxAmount', get(order, 'SalesTaxAmount'));

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

  // Loads the storefront column and action overrides for this page in a single pass.
  private loadDisplayActions(): void {
    this.subscriptions.push(
      this.storefrontService.getStorefront().pipe(
        take(1),
        switchMap((storefront) => {
          const flow = get(storefront, 'DefaultFlow') || 'system';
          return combineLatest([
            this.storefrontService.getStorefrontDisplayColumns(flow, get(storefront, 'Id')).pipe(catchError(() => of([]))),
            this.storefrontService.getStorefrontDisplayActions(flow, get(storefront, 'Id')).pipe(catchError(() => of([])))
          ]);
        }),
        catchError(() => of<[Array<DisplayColumn>, Array<DetailAction>]>([[], []]))
      ).subscribe(([columnsResponse, actionsResponse]) => {
        const allCols: Array<DisplayColumn> = columnsResponse ?? [];

        const orderCols = this.columnsInSection(allCols, DisplayColumnSection.OrderSummary);
        if (orderCols.length > 0) this.orderColumns = orderCols;

        const orderLineCols = this.columnsInSection(allCols, DisplayColumnSection.OrderLineItem);
        if (orderLineCols.length > 0) {
          this.orderLineItemColumns = orderLineCols.map((c: DisplayColumn) => ({
            fieldName: c.FieldName,
            label: c.Label,
            sequence: c.Sequence ?? 0,
            isSelected: true,
            isEditable: c.IsEditable ?? false
          }));
        }

        const priceCols = this.columnsInSection(allCols, DisplayColumnSection.LineItemPrice);
        if (priceCols.length > 0) this.priceColumns = priceCols;

        this.actions.applyOverrides(actionsResponse);
        this.cdr.detectChanges();
      })
    );
  }

  // Returns the configured columns for a section, ordered by Sequence.
  private columnsInSection(allCols: Array<DisplayColumn>, section: string): Array<DisplayColumn> {
    return allCols
      .filter((c: DisplayColumn) => c.Section === section)
      .sort((a, b) => (a.Sequence ?? 0) - (b.Sequence ?? 0));
  }

  // Template-callable wrapper over DisplayColumnService.recordForColumn.
  recordForColumn(record: AObject, fieldName: string): AObject {
    return this.displayColumnService.recordForColumn(record, fieldName);
  }

  // Returns the leaf field name for a configured column.
  fieldForColumn(fieldName: string): string {
    return this.displayColumnService.fieldForColumn(fieldName);
  }

  summaryFieldValue(emitted: AObject, fieldName: string): any {
    return this.displayColumnService.summaryFieldValue(emitted, fieldName);
  }

  // True when order fields may be edited at the current status, matching the stages the built-in
  // summary allows. Configured columns are only editable when they also set IsEditable.
  isOrderEditable(): boolean {
    const key = (get(this.orderStatusMap, [get(this.order, 'Status'), 'Key'], '') as string).toLowerCase();
    return key === 'draft' || key === 'generated' || key === 'presented';
  }

  // Tracks configured columns by field name so the summary does not re-render on every change.
  trackByFieldName(_index: number, col: DisplayColumn): string {
    return col.FieldName;
  }

  updateOrderValue(order: Order): Observable<Order> {
    return this.orderService.updateOrderValue(order).pipe(
      take(1),
      map((updatedOrder: Order) => {
        this.order = updatedOrder;
        this.cdr.detectChanges();
        return updatedOrder;
      })
    );
  }

  editOrderItems(order: Order) {
    this.lineItemLoader = true;
    this.orderService.convertOrderToCart(order).pipe(take(1)).subscribe(value => {
      set(value, 'Order', this.order);
      const hasTax = Number(get(order, 'SalesTaxAmount.Value', get(order, 'SalesTaxAmount'))) > 0;
      this.ngZone.run(() => this.router.navigate(['/carts', 'active'], { state: { autoTax: hasTax } }));
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

  private shouldSendEmailFromUI(): Observable<boolean> {
    return this.storefrontService.getConfigSettings().pipe(
      take(1),
      catchError(() => of({ enableEmailsFromDCUI: true })),
      map(configSettings => get(configSettings, 'enableEmailsFromDCUI', true))
    );
  }

  confirmOrder(orderId: string, primaryContactId: string) {
    this.isLoading = true;
    this.subscriptions.push(
      combineLatest([
        this.orderService.acceptOrder(orderId), 
        this.emailService.getEmailTemplateByName('DC Order Confirmation Template'),
        this.shouldSendEmailFromUI()
      ]).pipe(
        switchMap(([res, templateInfo, enableEmailsFromDCUI]) => {
          this.isLoading = false;
          if (res) {
            this.exceptionService.showSuccess('ACTION_BAR.ORDER_CONFIRMATION_TOASTR_MESSAGE', 'ACTION_BAR.ORDER_CONFIRMATION_TOASTR_TITLE');
          }
          else {
            this.exceptionService.showError('ACTION_BAR.ORDER_CONFIRMATION_FAILURE');
          }
          // Feature flag check for email notifications
          return (enableEmailsFromDCUI && templateInfo) 
            ? this.emailService.sendEmailNotificationWithTemplate(get(templateInfo, 'Id'), this.order, primaryContactId) 
            : of(null);
        }),
        take(1)
      ).subscribe(() => {
        this.getOrder();
      })
    );
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

    // Execute order update first, then check config for optional email
    obsv$.pipe(
      switchMap(() => this.shouldSendEmailFromUI()),
      switchMap(enableEmailsFromDCUI => {
        return enableEmailsFromDCUI
          ? this.emailService.getEmailTemplateByName('DC Order generate-document Template')
          : of(null);
      }),
      switchMap(template => {
        return template
          ? this.emailService.sendEmailNotificationWithTemplate(get(template, 'Id'), this.order, get(this.order.PrimaryContact, 'Id'))
          : of(null);
      }),
      take(1)
    ).subscribe(() => { 
      this.getOrder(); 
    });
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


  deleteAttachment(attachment: AttachmentDetails) {
    attachment.DocumentMetadata.set('deleting', true);
    this.attachmentService.deleteAttachment(attachment.DocumentMetadata.DocumentId).pipe(take(1)).subscribe(() => {
      attachment.DocumentMetadata.set('deleting', false);
      this.getAttachments();
    })
  }


  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());

    if (this.orderSubscription) {
      this.orderSubscription.unsubscribe();
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
