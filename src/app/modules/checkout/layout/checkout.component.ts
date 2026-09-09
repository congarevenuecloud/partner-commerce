import { Component, OnInit, ViewChild, ElementRef, OnDestroy, NgZone, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, Subscription, combineLatest, of, forkJoin } from 'rxjs';
import { switchMap, take, catchError, map } from 'rxjs/operators';
import { TabsetComponent } from 'ngx-bootstrap/tabs';
import { PopoverDirective } from 'ngx-bootstrap/popover';
import { TranslateService } from '@ngx-translate/core';
import { get, uniqueId, isNil, isEmpty } from 'lodash';
import { ConfigurationService, FilterOperator } from '@congarevenuecloud/core';
import {
  Account, Cart, CartService, Order, OrderService, Contact,
  UserService, AccountService, AccountInfo, EmailService, EmailTemplate, TaxAddress, StorefrontService,
  IntegrationService, TaxBreakup
} from '@congarevenuecloud/ecommerce';
import { ExceptionService, PriceSummaryComponent, LookupOptions, WizardStep } from '@congarevenuecloud/elements';
@Component({
  selector: 'app-cart',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class CheckoutComponent implements OnInit, OnDestroy {
  @ViewChild('addressTabs') addressTabs: any;
  @ViewChild('addressInfo') addressInfo: ElementRef;
  @ViewChild('staticTabs') staticTabs: TabsetComponent;
  @ViewChild('priceSummary') priceSummary: PriceSummaryComponent;
  primaryContact: Contact;
  order: Order;
  orderConfirmation: Order;
  loading: boolean = false;
  uniqueId: string;
  confirmedCartItems: any[] = [];
  confirmedCartSummary: any[] = [];
  confirmedCart: Cart = null; // Store cart reference for apt-price-summary component
  confirmedProductItems: any[] = [];
  paginatedConfirmedItems: any[] = [];
  confirmationPaginationMinVal: number = 0;
  confirmationPaginationMaxVal: number = 0;
  confirmationPaginationTotalVal: number = 0;

  // Tax breakup popover state for the confirmation step.
  confirmedHasSalesTax: boolean = false;
  taxBreakupMap: Map<string, TaxBreakup> = new Map();
  taxLoadingMap: Map<string, boolean> = new Map();
  taxErrorMap: Map<string, boolean> = new Map();
  private activeTaxPop: PopoverDirective = null;

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
    requiredOrderTitle: ''
  };
  cart: Cart;
  isLoggedIn: boolean;
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
    private translate: TranslateService,
    private userService: UserService,
    private accountService: AccountService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private ngZone: NgZone,
    private exceptionService: ExceptionService,
    private emailService: EmailService,
    private cdr: ChangeDetectorRef,
    private storefrontService: StorefrontService,
    private integrationService: IntegrationService) {
    this.uniqueId = uniqueId();
  }

  ngOnInit() {


    this.subscriptions.push(this.userService.isLoggedIn().subscribe(isLoggedIn => this.isLoggedIn = isLoggedIn));
    this.subscriptions.push(this.accountService.getCurrentAccount().subscribe((account) => {
      this.lookupOptions.expressionOperator = 'AND';
      this.lookupOptions.filters = account ? [{ field: 'Account.Id', value: get(account, 'Id'), filterOperator: FilterOperator.EQUAL }] : null;
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
        // Ship To and Bill To are locked to the app-level account.
        if (account) {
          this.order.ShipToAccount = account;
          this.order.BillToAccount = account;
        }
        if (!this.order.PriceList?.Id && get(cart, 'PriceList')) this.order.PriceList = get(cart, 'PriceList');

        this.onBillToChange();
        this.isButtonDisabled();
      })
    );

    this.subscriptions.push(
      combineLatest([
        this.translate.stream('PRIMARY_CONTACT.INVALID_FIRSTNAME'),
        this.translate.stream('PRIMARY_CONTACT.INVALID_LASTNAME'),
        this.translate.stream('PRIMARY_CONTACT.INVALID_EMAIL'),
        this.translate.stream('PRIMARY_CONTACT.INVALID_PRIMARY_CONTACT'),
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
    this.disableSubmit = isNil(this.order.PrimaryContact) || !this.order.Name || isNil(this.order.BillToAccount) || isNil(this.order.ShipToAccount) || !get(this.order.Location, 'Id');
  }

  submitOrder() {
    this.convertCartToOrder(get(this, 'order'), get(this, 'order.PrimaryContact'));
  }
  onBillToChange() {
    if (get(this.order.BillToAccount, 'Id'))
      this.billToAccount$ = this.accountService.getAccount(get(this.order.BillToAccount, 'Id'));
    this.isButtonDisabled()
  }

  onShippingLocationChange(): void {
    this.isButtonDisabled();
    const location = get(this.order.Location, 'Location');
    if (!get(this.order.Location, 'Id') || !get(location, 'Id')) {
      this.taxAddress = null;
      if (get(this.order.Location, 'Id') && !get(location, 'Id')) {
        this.exceptionService.showError(this.translate.instant('TAX.LOCATION_MISSING_POSTAL_CODE'));
      }
      this.cdr.markForCheck();
      return;
    }
    const postalCode = get(location, 'PostalCode');
    if (postalCode) {
      this.taxAddress = {
        Line1: get(location, 'Street', '') || '',
        Line2: get(location, 'AddressLine', '') || '',
        City: get(location, 'City', '') || '',
        Region: get(location, 'State', '') || '',
        Country: get(location, 'Country', '') || '',
        PostalCode: postalCode.toString()
      };
    } else {
      this.taxAddress = null;
      this.exceptionService.showError(this.translate.instant('TAX.LOCATION_MISSING_POSTAL_CODE'));
    }
    this.cdr.markForCheck();
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
    // Ship To / Bill To stay locked to the app-level account; only validation is needed here.
    this.isButtonDisabled();
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
    // Determine whether a Sales Tax summary group exists so the confirmation step can show the tax icon.
    this.confirmedHasSalesTax = this.confirmedCartSummary.some(group =>
      (get(group, 'ChargeType') ?? '').toLowerCase() === 'sales tax'
    );
    // Reset per-item tax breakup caches for the confirmed cart.
    this.taxBreakupMap.clear();
    this.taxLoadingMap.clear();
    this.taxErrorMap.clear();

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

  // TO DO : Remove this method once email sending logic is moved to backend
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

  // Filter confirmed cart items to primary product line items only
  closeTaxPopover(): void {
    this.activeTaxPop?.hide();
  }

  openEstimateTaxPopup(itemId: string, pop?: PopoverDirective): void {
    if (pop) { this.activeTaxPop = pop; }
    this.taxLoadingMap.set(itemId, true);
    this.taxErrorMap.set(itemId, false);
    this.taxBreakupMap.set(itemId, null);
    this.cdr.markForCheck();

    this.subscriptions.push(
      this.integrationService.getLineLevelTax(itemId).pipe(take(1)).subscribe(
        (item: TaxBreakup) => {
          this.taxBreakupMap.set(itemId, item);
          this.taxLoadingMap.set(itemId, false);
          this.cdr.markForCheck();
        },
        () => {
          this.taxErrorMap.set(itemId, true);
          this.taxLoadingMap.set(itemId, false);
          this.cdr.markForCheck();
        }
      )
    );
  }

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