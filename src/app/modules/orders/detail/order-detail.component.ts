import { Component, OnInit, ViewEncapsulation, OnDestroy, ChangeDetectorRef, AfterViewChecked, NgZone, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription, BehaviorSubject, combineLatest, of } from 'rxjs';
import { filter, map, switchMap, mergeMap, startWith } from 'rxjs/operators';
import { get, set, indexOf, sum, cloneDeep, find, defaultTo } from 'lodash';
import {
  Order, OrderLineItem, OrderService, UserService,
  ItemGroup, LineItemService, Note, NoteService, AccountService,
  Contact, OrderLineItemService, Account, ContactService, OrderPayload, QuoteService
} from '@congarevenuecloud/ecommerce';
import { ExceptionService, LookupOptions } from '@congarevenuecloud/elements';
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

  noteSubscription: Subscription;
  orderSubscription: Subscription;

  @ViewChild('attachmentSection') attachmentSection: ElementRef;

  private subscriptions: Subscription[] = [];
  orderGenerated: boolean = false;
  isLoggedIn$: Observable<boolean>;

  orderStatusSteps = [
    'Draft',
    'Generated',
    'Presented',
    'Confirmed',
    'In Fulfillment',
    'Fulfilled',
    'Activated'
  ];

  orderStatusMap = {
    'Draft': 'Draft',
    'Confirmed': 'Confirmed',
    'Processing': 'Generated',
    'In Fulfillment': 'In Fulfillment',
    'Partially Fulfilled': 'Partially Fulfilled',
    'Fulfilled': 'Fulfilled',
    'Activated': 'Activated',
    'In Amendment': 'Draft',
    'Being Amended': 'Draft',
    'Superseded': 'Draft',
    'Generated': 'Generated',
    'Presented': 'Presented'
  };

  isLoading: boolean = false;

  note: Note = new Note();

  commentsLoader: boolean = false;

  lineItemLoader: boolean = false;

  ShipToAddress: Account;

  lookupOptions: LookupOptions = {
    primaryTextField: 'Name',
    secondaryTextField: 'Email',
    fieldList: ['Name', 'Id', 'Email']
  };

  constructor(private activatedRoute: ActivatedRoute,
    private orderService: OrderService,
    private userService: UserService,
    private exceptionService: ExceptionService,
    private noteService: NoteService,
    private accountService: AccountService,
    private cdr: ChangeDetectorRef,
    private orderLineItemService: OrderLineItemService,
    private quoteService: QuoteService,
    private contactService: ContactService,
    private ngZone: NgZone) { }

  ngOnInit() {
    this.isLoggedIn$ = this.userService.isLoggedIn();
    this.getOrder();
    this.subscriptions.push(this.accountService.getCurrentAccount().subscribe(account => {
      this.lookupOptions.expressionOperator = 'AND';
      this.lookupOptions.filters = null;
      this.lookupOptions.sortOrder = null;
      this.lookupOptions.page = 10;
    }));
  }

  getOrder() {
    if (this.orderSubscription) this.orderSubscription.unsubscribe();

    const order$ = this.activatedRoute.params
      .pipe(
        filter(params => get(params, 'id') != null),
        map(params => get(params, 'id')),
        mergeMap(orderId => this.orderService.getOrder(orderId)),
        switchMap((order: Order) => combineLatest([
          of(order),
          get(order, 'Proposal') ? this.quoteService.getQuote(`${get(order.Proposal, 'Id')}`) : of(null),
          get(order.BillToAccount, 'Id') ? this.accountService.getAccount(get(order.BillToAccount, 'Id')) : of(null),
          get(order.ShipToAccount, 'Id') ? this.accountService.getAccount(get(order.ShipToAccount, 'Id')) : of(null),
          get(order.PrimaryContact, 'Id') ? this.contactService.fetch(get(order.PrimaryContact, 'Id')) : of(null),
          this.accountService.getCurrentAccount()
        ])),
        map(([order, quote, billToAccount, shipToAccount, contact, soldToAccount]) => {
          order.Proposal = quote;
          order.SoldToAccount = defaultTo(find([soldToAccount], acc => acc.Id === order.SoldToAccount.Id), order.SoldToAccount);
          order.BillToAccount = defaultTo(billToAccount, order.BillToAccount);
          order.ShipToAccount = defaultTo(shipToAccount, order.ShipToAccount);
          order.PrimaryContact = defaultTo(contact, order.PrimaryContact) as Contact;
          set(order, 'PrimaryContact.Account', find(billToAccount, acc => order.PrimaryContact && get(acc, 'Id') === get(order.PrimaryContact.Account, 'Id')));
          return order;
        })
      );

    const lineItems$ = this.activatedRoute.params
      .pipe(
        filter(params => get(params, 'id') != null),
        map(params => get(params, 'id')),
        mergeMap(orderId => this.orderLineItemService.getOrderLineItems(orderId)));

    this.orderSubscription = combineLatest(order$.pipe(startWith(null)))
      .pipe(map(([order]) => {
        if (!order) return;

        if (order.Status === 'Partially Fulfilled' && indexOf(this.orderStatusSteps, 'Fulfilled') > 0)
          this.orderStatusSteps[indexOf(this.orderStatusSteps, 'Fulfilled')] = 'Partially Fulfilled';

        if (order.Status === 'Fulfilled' && indexOf(this.orderStatusSteps, 'Partially Fulfilled') > 0)
          this.orderStatusSteps[indexOf(this.orderStatusSteps, 'Partially Fulfilled')] = 'Fulfilled';

        order.OrderLineItems = get(order, 'Items');
        this.orderLineItems$.next(LineItemService.groupItems(order.OrderLineItems));
        return this.updateOrder(order);
      })).subscribe();
  }

  refreshOrder(fieldValue, order, fieldName) {
    set(order, fieldName, fieldValue);
    const payload: OrderPayload = {
      'PrimaryContact': order.PrimaryContact,
      'Description': order.Description,
      'ShipToAccount': order.ShipToAccount,
      'BillToAccount': order.BillToAccount
    };
    this.orderService.updateOrder(order.Id, payload).subscribe(r => {
      this.getOrder();
    });
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
    this.orderService.acceptOrder(orderId).subscribe((res) => {
      this.isLoading = false;
      if (res) {
        this.exceptionService.showSuccess('ACTION_BAR.ORDER_CONFIRMATION_TOASTR_MESSAGE', 'ACTION_BAR.ORDER_CONFIRMATION_TOASTR_TITLE');
        this.getOrder();
      }
      else
        this.exceptionService.showError('ACTION_BAR.ORDER_CONFIRMATION_FAILURE');
    });
  }

  onGenerateOrder() {
    if (this.attachmentSection) this.attachmentSection.nativeElement.scrollIntoView({ behavior: 'smooth' });
    this.getOrder();
    this.orderGenerated = true;
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
}