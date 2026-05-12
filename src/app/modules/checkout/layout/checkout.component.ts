import { Component, OnInit, ViewChild, ElementRef, TemplateRef, OnDestroy, NgZone, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, Subscription, combineLatest, of, forkJoin } from 'rxjs';
import { switchMap, take, catchError, map } from 'rxjs/operators';
import { TabsetComponent } from 'ngx-bootstrap/tabs';
import { BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { TranslateService } from '@ngx-translate/core';
import { get, uniqueId, isNil, isEmpty } from 'lodash';
import { ConfigurationService } from '@congarevenuecloud/core';
import {
  Account, Cart, CartService, Order, OrderService, Contact, ContactService,
  UserService, AccountService, AccountInfo, EmailService, EmailTemplate, TaxAddress, StorefrontService
} from '@congarevenuecloud/ecommerce';
import { ExceptionService, PriceSummaryComponent, LookupOptions, WizardStep } from '@congarevenuecloud/elements';
@Component({
  selector: 'app-cart',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutComponent implements OnInit, OnDestroy {
  @ViewChild('addressTabs') addressTabs: any;
  @ViewChild('addressInfo') addressInfo: ElementRef;
  @ViewChild('staticTabs') staticTabs: TabsetComponent;
  @ViewChild('confirmationTemplate') confirmationTemplate: TemplateRef<any>;
  @ViewChild('priceSummary') priceSummary: PriceSummaryComponent;
  primaryContact: Contact;
  order: Order;
  orderConfirmation: Order;
  loading: boolean = false;
  uniqueId: string;
  confirmationModal: BsModalRef;
  private lastProcessedContactId: string = null;
  confirmedCartItems: any[] = [];
  confirmedCartSummary: any[] = [];
  confirmedCart: Cart = null; // Store cart reference for apt-price-summary component
  confirmedProductItems: any[] = [];
  paginatedConfirmedItems: any[] = [];
  confirmationPaginationMinVal: number = 0;
  confirmationPaginationMaxVal: number = 0;
  confirmationPaginationTotalVal: number = 0;

  // Pagination for confirmation step
  confirmationCurrentPage: number = 1;
  confirmationItemsPerPage: number = 5;
  confirmationItemsPerPageOptions: number[] = [5, 10, 15];
  Math = Math;

  paginationButtonLabels: any = {
    first: '',
    previous: '',
    next: '',
    last: ''
  };

  errMessages: any = {
    requiredFirstName: '',
    requiredLastName: '',
    requiredEmail: '',
    requiredPrimaryContact: '',
    requiredShipToAcc: '',
    requiredBillToAcc: '',
    requiredOrderTitle: ''
  };
  cart: Cart;
  isLoggedIn: boolean;
  shipToAccount$: Observable<Account>;
  billToAccount$: Observable<Account>;
  primaryContact$: Observable<any>;
  pricingSummaryType: 'checkout' | 'paymentForOrder' | '' = 'checkout';
  breadcrumbs;
  lookupOptions: LookupOptions = {
    primaryTextField: 'Name',
    secondaryTextField: 'Email',
    fieldList: ['Id', 'Name', 'Email']
  };
  disableSubmit: boolean = false;
  showCaptcha: boolean = false;
  displayCaptcha: boolean;
  private isOrderConversionStarted: boolean = false;

  // Tax calculation properties
  taxAddress: TaxAddress;
  taxCalculated: boolean = false;
  taxCalculationEnabled: boolean = false;

  // Wizard configuration
  wizardSteps: WizardStep[] = [
    {
      id: 'checkout',
      label: 'CART.CHECKOUT',
      completed: false
    },
    {
      id: 'review',
      label: 'WIZARD_CHECKOUT.REVIEW_ORDER',
      completed: false
    },
    {
      id: 'confirmation',
      label: 'WIZARD_CHECKOUT.CONFIRMATION',
      completed: false,
      clickable: false
    }
  ];

  wizardConfig = {
    showStepNumbers: true,
    showNavigation: false
  };

  /**
   * Current wizard step index (0-based)
   */
  currentStepIndex: number = 0;

  private subscriptions: Subscription[] = [];

  constructor(private cartService: CartService,
    public configurationService: ConfigurationService,
    private orderService: OrderService,
    private modalService: BsModalService,
    public contactService: ContactService,
    private translate: TranslateService,
    private userService: UserService,
    private accountService: AccountService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private ngZone: NgZone,
    private exceptionService: ExceptionService,
    private emailService: EmailService,
    private cdr: ChangeDetectorRef,
    private storefrontService: StorefrontService) {
    this.uniqueId = uniqueId();
  }

  ngOnInit() {


    this.subscriptions.push(this.userService.isLoggedIn().subscribe(isLoggedIn => this.isLoggedIn = isLoggedIn));
    this.subscriptions.push(this.accountService.getCurrentAccount().subscribe(() => {
      this.lookupOptions.expressionOperator = 'AND';
      this.lookupOptions.filters = null;
      this.lookupOptions.sortOrder = null;
      this.lookupOptions.page = 10;
    }));
    this.order = new Order();

    this.subscriptions.push(
      combineLatest([
        this.accountService.getCurrentAccount(),
        this.cartService.getMyCart()
      ]).subscribe(([account, cart]) => {
        // Skip cart updates after order conversion has started to avoid fetching a new empty cart
        if (this.isOrderConversionStarted) {
          return;
        }
        this.cart = cart;

        // Navigate to manage cart if cart is empty
        if (isEmpty(get(cart, 'LineItems'))) {
          this.ngZone.run(() => {
            this.router.navigate(['/carts/active']);
          });
          return;
        }

        if (!this.order.Name) this.order.Name = 'New Order';
        if (!this.order.SoldToAccount?.Id && account) this.order.SoldToAccount = account;
        // Do not pre-populate BillToAccount and ShipToAccount with partner account
        // These should only be populated when Primary Contact is selected
        if (!this.order.PriceList?.Id && get(cart, 'PriceList')) this.order.PriceList = get(cart, 'PriceList');

        this.onBillToChange();
        this.onShipToChange();
        this.isButtonDisabled();
      })
    );

    this.subscriptions.push(
      combineLatest([
        this.translate.stream('PRIMARY_CONTACT.INVALID_FIRSTNAME'),
        this.translate.stream('PRIMARY_CONTACT.INVALID_LASTNAME'),
        this.translate.stream('PRIMARY_CONTACT.INVALID_EMAIL'),
        this.translate.stream('PRIMARY_CONTACT.INVALID_PRIMARY_CONTACT'),
        this.translate.stream('PRIMARY_CONTACT.INVALID_BILL_TO_ACC'),
        this.translate.stream('PRIMARY_CONTACT.INVALID_SHIP_TO_ACC'),
        this.translate.stream('PRIMARY_CONTACT.INVALID_ORDER_TITLE'),
        this.translate.stream('AOBJECTS.CART'),
        this.translate.stream('PAGINATION.FIRST'),
        this.translate.stream('PAGINATION.PREVIOUS'),
        this.translate.stream('PAGINATION.NEXT'),
        this.translate.stream('PAGINATION.LAST'),
      ]).subscribe(
        ([
          firstName,
          lastName,
          email,
          primaryContact,
          billToAcc,
          shipToAcc,
          orderTitle,
          cartLabel,
          first,
          previous,
          next,
          last,
        ]) => {
          this.errMessages.requiredFirstName = firstName;
          this.errMessages.requiredLastName = lastName;
          this.errMessages.requiredEmail = email;
          this.errMessages.requiredPrimaryContact = primaryContact;
          this.errMessages.requiredBillToAcc = billToAcc;
          this.errMessages.requiredShipToAcc = shipToAcc;
          this.errMessages.requiredOrderTitle = orderTitle;
          this.paginationButtonLabels.first = first;
          this.paginationButtonLabels.previous = previous;
          this.paginationButtonLabels.next = next;
          this.paginationButtonLabels.last = last;
          this.cdr.markForCheck();
          this.breadcrumbs = [
            {
              label: cartLabel,
              route: ['/carts/active'],
            },
          ];
        }
      )
    );
  }

  isButtonDisabled() {
    this.disableSubmit = isNil(this.order.PrimaryContact) || !this.order.Name || isNil(this.order.BillToAccount) || isNil(this.order.ShipToAccount);
  }

  submitOrder() {
    this.convertCartToOrder(get(this, 'order'), get(this, 'order.PrimaryContact'));
  }
  onBillToChange() {
    if (get(this.order.BillToAccount, 'Id'))
      this.billToAccount$ = this.accountService.getAccount(get(this.order.BillToAccount, 'Id'));
    this.isButtonDisabled()
  }

  onShipToChange() {
    if (get(this.order.ShipToAccount, 'Id')) {
      this.shipToAccount$ = this.accountService.getAccount(get(this.order.ShipToAccount, 'Id'));
      // Update tax address when shipping account changes
      this.subscriptions.push(
        this.shipToAccount$.subscribe(account => {
          this.updateTaxAddress(account);
        })
      );
    }
    this.isButtonDisabled()
  }

  // Update tax address based on shipping account
  updateTaxAddress(account?: Account): void {
    if (!account) return;

    this.taxAddress = {
      Line1: account.ShippingStreet || '',
      Line2: '',
      City: account.ShippingCity || '',
      Region: account.ShippingState || '',
      Country: account.ShippingCountry || '',
      PostalCode: account.ShippingPostalCode || ''
    };
  }

  // Handle tax status changes from price summary component
  onTaxStatusChange(status: { calculated: boolean, enabled: boolean, amount: number }): void {
    this.taxCalculated = status.calculated;
    this.taxCalculationEnabled = status.enabled;
  }

  // Check if checkout button should be disabled
  isCheckoutDisabled(): boolean {
    return this.disableSubmit || (this.cart?.LineItems?.length < 1) || this.loading;
  }

  onPrimaryContactChange() {
    // Handle Primary Contact cleared
    if (!this.order.PrimaryContact || !get(this.order.PrimaryContact, 'Id')) {
      // Clear Bill To and Ship To when Primary Contact is cleared
      this.order.BillToAccount = null;
      this.order.ShipToAccount = null;
      this.billToAccount$ = null;
      this.shipToAccount$ = null;
      this.lastProcessedContactId = null;
      this.isButtonDisabled();
      return;
    }

    const contactId = get(this.order.PrimaryContact, 'Id');
    
    // Skip if this contact ID was already processed to avoid redundant API calls
    if (contactId === this.lastProcessedContactId) {
      return;
    }
    
    // Check if contact already has Account data loaded
    const existingAccount = get(this.order.PrimaryContact, 'Account');
    if (existingAccount && get(existingAccount, 'Id')) {
      // Account already loaded, just populate Bill To and Ship To
      this.order.BillToAccount = existingAccount;
      this.order.ShipToAccount = existingAccount;
      this.onBillToChange();
      this.onShipToChange();
      this.lastProcessedContactId = contactId;
      this.isButtonDisabled();
      return;
    }

    // Fetch Primary Contact with Account relationship and populate Bill To and Ship To
    this.subscriptions.push(
      this.contactService.getContactById(contactId).subscribe(contact => {
        if (contact) {
          // Update contact with full data including Account
          Object.assign(this.order.PrimaryContact, contact);

          // Auto-populate BillToAccount and ShipToAccount from Primary Contact's Account
          const contactAccount = get(contact, 'Account');
          if (contactAccount && get(contactAccount, 'Id')) {
            this.order.BillToAccount = contactAccount;
            this.order.ShipToAccount = contactAccount;
            this.onBillToChange();
            this.onShipToChange();
          } else {
            // If contact has no account, clear Bill To and Ship To
            this.order.BillToAccount = null;
            this.order.ShipToAccount = null;
            this.billToAccount$ = null;
            this.shipToAccount$ = null;
          }
          this.lastProcessedContactId = contactId;
          this.isButtonDisabled();
        } else {
          this.lastProcessedContactId = null;
        }
      })
    );
  }

  onPreviewOrder(): void {
    this.currentStepIndex++;
  }

  onWizardStepChange(event: any): void {
    const currentStepId = this.wizardSteps[event.currentIndex]?.id;
    const previousStepId = this.wizardSteps[event.previousIndex]?.id;

    // Prevent navigation away from confirmation step
    if (previousStepId === 'confirmation' && currentStepId !== 'confirmation') {
      // Do not update currentStepIndex - wizard will stay at confirmation via binding
      return;
    }

    // Update currentStepIndex for valid navigation
    this.currentStepIndex = event.currentIndex;
  }

  convertCartToOrder(order: Order, primaryContact: Contact, cart?: Cart, selectedAccount?: AccountInfo, acceptOrder?: boolean) {
    this.isOrderConversionStarted = true;
    this.loading = true;

    // Store cart reference and data BEFORE the API call
    // Keep a reference to the cart object for apt-price-summary component
    this.confirmedCart = this.cart;

    // Also store arrays for pagination
    if (this.cart && this.cart.LineItems) {
      this.confirmedCartItems = [...this.cart.LineItems];
      this.updateConfirmedProductItems();
    }
    if (this.cart && this.cart.SummaryGroups) {
      this.confirmedCartSummary = [...this.cart.SummaryGroups];
    }

    this.orderService.convertCartToOrder(order, primaryContact).pipe(
      take(1)
    ).subscribe(orderResponse => {
      this.loading = false;
      this.orderConfirmation = orderResponse;
      this.onOrderConfirmed();
    },
      err => {
        this.exceptionService.showError(err);
        this.loading = false;
      });
  }


  redirectOrderPage() {
    this.ngZone.run(() => {
      this.router.navigate(['/orders', this.orderConfirmation.Id]);
    });
  }
  onOrderConfirmed() {
    // Mark previous steps as completed
    const checkoutStep = this.wizardSteps.find(step => step.id === 'checkout');
    if (checkoutStep) {
      checkoutStep.completed = true;
    }
    const reviewStep = this.wizardSteps.find(step => step.id === 'review');
    if (reviewStep) {
      reviewStep.completed = true;
    }
    const confirmationStep = this.wizardSteps.find(step => step.id === 'confirmation');
    if (confirmationStep) {
      confirmationStep.completed = true;
    }

    // Make all steps non-clickable on confirmation
    this.wizardSteps.forEach(step => {
      step.clickable = false;
    });

    // Navigate to the confirmation wizard step
    this.currentStepIndex++;
    
    // Feature flag check for email notifications
    if (get(this.orderConfirmation, 'Id')) {
      this.shouldSendEmailFromUI().pipe(
        switchMap(enableEmailsFromDCUI => {
          return enableEmailsFromDCUI
            ? this.emailService.getEmailTemplateByName('DC Order Notification Template')
            : of(null);
        }),
        switchMap((templateInfo: EmailTemplate) => {
          return templateInfo
            ? this.emailService.sendEmailNotificationWithTemplate(get(templateInfo, 'Id'), this.orderConfirmation, get(this.orderConfirmation.PrimaryContact, 'Id'))
            : of(null);
        }),
        take(1)
      ).subscribe();
    }
  }

  private shouldSendEmailFromUI(): Observable<boolean> {
    return this.storefrontService.getConfigSettings().pipe(
      take(1),
      catchError(() => of({ enableEmailsFromDCUI: true })),
      map(configSettings => get(configSettings, 'enableEmailsFromDCUI', true))
    );
  }

  loadCaptcha() {
    this.displayCaptcha = true;
  }

  captchaSuccess(cart: Cart) {
    this.showCaptcha = false;
    this.submitOrder();
  }

  orderPlacement() {
    if (this.displayCaptcha)
      this.showCaptcha = true;
    else {
      this.submitOrder();
    }
  }

  closeModal() {
    this.confirmationModal.hide();
    this.redirectOrderPage();
  }

  // Filter confirmed cart items to primary product line items only
  private updateConfirmedProductItems(): void {
    if (!this.confirmedCartItems || this.confirmedCartItems.length === 0) {
      this.confirmedProductItems = [];
      this.confirmationPaginationMinVal = 0;
      this.confirmationPaginationMaxVal = 0;
      this.confirmationPaginationTotalVal = 0;
      return;
    }
    this.confirmedProductItems = this.confirmedCartItems.filter(item =>
      get(item, 'LineType') === 'Product/Service' &&
      !get(item, 'ParentBundleNumber') &&
      !get(item, 'IsOptionRollupLine') &&
      get(item, 'IsPrimaryLine') === true
    );
    this.updateConfirmationPaginationDisplay();
    this.cdr.markForCheck();
  }

  private updateConfirmationPaginationDisplay(): void {
    this.confirmationPaginationTotalVal = this.confirmedProductItems.length;
    if (this.confirmationPaginationTotalVal === 0) {
      this.confirmationPaginationMinVal = 0;
      this.confirmationPaginationMaxVal = 0;
      this.paginatedConfirmedItems = [];
      return;
    }
    const startIndex = (this.confirmationCurrentPage - 1) * Number(this.confirmationItemsPerPage);
    const endIndex = startIndex + Number(this.confirmationItemsPerPage);
    this.confirmationPaginationMinVal = startIndex + 1;
    this.confirmationPaginationMaxVal = Math.min(endIndex, this.confirmationPaginationTotalVal);
    this.paginatedConfirmedItems = this.confirmedProductItems.slice(startIndex, endIndex);
    this.cdr.markForCheck();
  }

  onConfirmationItemsPerPageChange(newSize: number): void {
    this.confirmationItemsPerPage = Number(newSize);
    this.confirmationCurrentPage = 1; // Reset to first page
    this.updateConfirmationPaginationDisplay();
  }

  onConfirmationPageChange(event: any): void {
    this.confirmationCurrentPage = event.page;
    this.updateConfirmationPaginationDisplay();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}