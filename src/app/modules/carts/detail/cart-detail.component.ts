import { Component, OnInit, TemplateRef, ViewChild, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, combineLatest, of, throwError } from 'rxjs';
import { map, switchMap, take, filter as _filter, debounceTime, catchError } from 'rxjs/operators';
import { filter, find, forEach, get, isEqual, isNil, isNull, lowerCase, pick, set } from 'lodash';
import { BsModalService } from 'ngx-bootstrap/modal';
import { plainToClass } from 'class-transformer';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { Cart, CartItem, CartService, LineItemService, Order, Quote, ItemGroup, QuoteService, ConstraintRuleService, OrderService, ItemRequest, IntegrationService, TaxAddress, AccountService } from '@congarevenuecloud/ecommerce';
import { BatchActionService, RevalidateCartService, ExceptionService, ButtonAction, BatchSelectionService } from '@congarevenuecloud/elements';
import { DsrService } from '../../../services/dsr.service';


@Component({
  selector: 'app-cart-detail',
  templateUrl: './cart-detail.component.html',
  styleUrls: ['./cart-detail.component.scss']
})

export class CartDetailComponent implements OnInit {
  // Tracks the last cart ID where tax was calculated — survives component
  // destruction during SPA navigation (router.navigate to catalog and back).
  // Single value, never accumulates.
  private static lastTaxCalculatedCartId: string = null;

  @ViewChild('discardChangesTemplate') discardChangesTemplate: TemplateRef<any>;
  @ViewChild('cloneCartTemplate') cloneCartTemplate: TemplateRef<any>;

  modalRef: BsModalRef;
  view$: BehaviorSubject<ManageCartState> = new BehaviorSubject<ManageCartState>(null);
  businessObject$: Observable<Order | Quote> = of(null);
  quoteConfirmation: Quote;
  confirmationModal: BsModalRef;
  loading: boolean = false;
  primaryLI: Array<CartItem> = [];
  readOnly: boolean = false;
  isDsrMode: boolean = false;
  cart: Cart;
  subscription: Array<Subscription> = [];
  disabled: boolean;
  isCartFinalized: boolean = false;
  searchText: string;
  cartName: string;
  selectedCount: number = 0;
  customButtonActions: Array<ButtonAction> = [
    {
      label: 'MY_ACCOUNT.CART_LIST.CLONE_CART',
      enabled: true,
      onClick: () => this.openCloneCartModal(),
    },
  ]
  showSideNav: boolean = false;
  isTaxEnabled: boolean = false;
  taxLoader: boolean = false;
  taxAutoTriggered: boolean = false;
  showTaxWarning: boolean = false;

  showTaxCalculating: boolean = false;
  taxCalculated: boolean = false;
  businessObjectType: string = 'ProductConfiguration';

  constructor(private cartService: CartService,
    private quoteService: QuoteService,
    private orderService: OrderService,
    private router: Router,
    private ngZone: NgZone,
    private revalidateCartService: RevalidateCartService,
    private crService: ConstraintRuleService,
    private activatedRoute: ActivatedRoute,
    public batchActionService: BatchActionService,
    private modalService: BsModalService,
    private exceptionService: ExceptionService,
    public batchSelectionService: BatchSelectionService,
    private dsrService: DsrService,
    private integrationService: IntegrationService,
    private accountService: AccountService
  ) { }
  ngOnInit() {
    // Subscribe to DSR mode state
    this.subscription.push(
      this.dsrService.getDsrState().pipe(
        map(state => state.isDsrMode)
      ).subscribe(isDsrMode => {
        this.isDsrMode = isDsrMode;
        if (isDsrMode) {
          // Hide save favorite action in DSR mode
          this.batchActionService.hideActions([this.batchActionService._saveFavorite]);
        } else {
          this.batchActionService.showActions([this.batchActionService._saveFavorite]);
        }
      })
    );
    
    this.getCart();
    this.subscription.push(this.integrationService.isTaxIntegrationEnabled().pipe(
      catchError(() => of(false)),
      take(1)
    ).subscribe(isTaxEnabled => {
      this.isTaxEnabled = isTaxEnabled;
      this.autoTriggerTaxIfNeeded();
    }));
  }

  getCart() {
    this.loading = false;
    this.subscription.push(combineLatest([
      this.cartService.getMyCart(),
      this.crService.getRecommendationsForCart(),
      this.cartService.isCartActive(get(this.activatedRoute.params, "_value.id")) ? of(null) : this.cartService.fetchCartInfo(get(this.activatedRoute.params, "_value.id"), 'summary-groups,price-breakups,line-items,line-items.product,usage-tiers,adjustments'),
      this.revalidateCartService.revalidateFlag,
      this.batchSelectionService.getSelectedLineItems()
    ]).pipe(
      debounceTime(500),
      switchMap(([cart, products, nonActiveCart, revalidateFlag, selectedCount]) => {
        this.selectedCount = selectedCount?.length ? selectedCount.length : 0;
        this.disabled = revalidateFlag;
        this.readOnly = get(cart, 'Id') === get(nonActiveCart, 'Id') || isNull(nonActiveCart) ? false : true;
        if (this.readOnly) {
          this.batchActionService.setShowCloneAction(true);
        } else {
          this.batchActionService.setShowCloneAction(false);
        }
        cart = this.readOnly ? nonActiveCart : cart;
        this.isCartFinalized = get(cart, 'Status') === 'Finalized';
        this.cart = cart;
        this.primaryLI = filter((get(cart, 'LineItems')), (i) => i.IsPrimaryLine && i.LineType === 'Product/Service');
        const businessObjectId = get(cart, 'BusinessObjectId');
        const isProposal = isEqual(get(cart, 'BusinessObjectType'), 'Proposal');
        const businessObject = isProposal ? get(cart, 'Proposald') : get(cart, 'Order');
        if (this.isCartFinalized || (!isNil(businessObjectId) && isNil(businessObject))) {
          this.businessObject$ = isEqual(get(cart, 'BusinessObjectType'), 'Proposal') ?
            this.quoteService.getQuoteById(get(cart, 'BusinessObjectId'), false) : this.orderService.getOrder(get(cart, 'BusinessObjectId'), null);
        } else {
          this.businessObject$ = of(null);
        }
        return combineLatest([of(this.cart), this.businessObject$, of(products)]);
      }),
      switchMap(([cartInfo, businessObjectInfo, productsInfo]) => {
        const businessObjectType = get(cartInfo, 'BusinessObjectType');
        const proposalId = get(cartInfo, 'Proposald');
        const orderId = get(cartInfo, 'Order');
        if (isEqual(businessObjectType, 'Proposal')) {
          if (isNil(proposalId) || this.isCartFinalized) set(cartInfo, 'Proposald', businessObjectInfo);
        }
        else if (isNil(orderId) || this.isCartFinalized) {
          set(cartInfo, 'Order', businessObjectInfo);
        }
        return of({
          cart: cartInfo,
          lineItems: LineItemService.groupItems(get(cartInfo, 'LineItems')),
          orderOrQuote: isNil(get(cartInfo, 'Order')) ? get(cartInfo, 'Proposald') : get(cartInfo, 'Order'),
          productList: productsInfo,
          headerInfo: Object.assign(new Cart(), {
            Id: this.cart.Id,
            Name: this.cart.Name
          })
        } as ManageCartState);
      })
    ).subscribe(cartState => {
      this.view$.next(cartState);
      this.autoTriggerTaxIfNeeded();
      this.trackLineItemChanges(cartState);
    }));
  }

  private autoTriggerTaxIfNeeded() {
    // Guard: only run once per component lifecycle, and only when tax integration is enabled.
    if (this.taxAutoTriggered || !this.isTaxEnabled) return;

    const view = this.view$.value;
    const cart = view?.cart;
    const businessObjectId = get(cart, 'BusinessObjectId');

    // Cart is not yet linked to an order/quote — nothing to check.
    if (!businessObjectId) return;

    // Check if the cart itself currently has tax in SummaryGroups.
    const cartHasTax = !!find(get(cart, 'SummaryGroups', []), group =>
      get(group, 'ChargeType', '').toLowerCase() === 'sales tax'
    );

    // Restore from static property: tax was calculated in a prior component lifecycle
    // (before navigating to catalog and back via forward navigation).
    const cartId = get(cart, 'Id');
    if (cartHasTax || (cartId && CartDetailComponent.lastTaxCalculatedCartId === cartId)) {
      this.taxCalculated = true;
    }

    const isProposal = get(cart, 'BusinessObjectType') === 'Proposal';
    const fetch$: Observable<Quote | Order> = isProposal
      ? this.quoteService.getQuoteById(businessObjectId, false)
      : this.orderService.getOrder(businessObjectId, null);

    // Read the autoTax flag from history state — set by order-detail / quote-detail
    // when the user clicks "Edit Line Items" and the source record had tax.
    const navState = history.state;
    const shouldAutoCalculate = !!navState?.autoTax;

    // Mark as triggered so subsequent cart reloads don't re-run this logic.
    this.taxAutoTriggered = true;

    if (shouldAutoCalculate) {
      // Clear the flag from history so a manual page refresh doesn't re-trigger auto-calculation.
      history.replaceState({ ...navState, autoTax: false }, '', window.location.href);
    }

    fetch$.pipe(take(1)).subscribe(result => {
      const taxAmount = get(result, 'SalesTaxAmount.Value', get(result, 'SalesTaxAmount'));

      // Only proceed if the source order/quote had tax OR the cart previously had tax calculated.
      if (Number(taxAmount) > 0 || this.taxCalculated) {
        // Mark that tax was previously calculated so trackLineItemChanges can
        // show the warning banner if the user adds/removes products later.
        this.taxCalculated = true;

        if (shouldAutoCalculate) {
          // User just navigated from order/quote detail — kick off recalculation automatically.
          this.showTaxCalculating = true;
          this.autoCalculateTax();
        } else {
          // Component was recreated (e.g. after navigating to catalog and back).
          // Auto-calculate is not triggered again, but warn the user if tax is
          // now missing from the cart (e.g. a product was added since last calc).
          const currentHasTax = !!find(get(this.view$.value, 'cart.SummaryGroups', []), group =>
            get(group, 'ChargeType', '').toLowerCase() === 'sales tax'
          );
          if (!currentHasTax && !this.taxLoader) {
            this.showTaxWarning = true;
          }
        }
      }
    });
  }

  private trackLineItemChanges(cartState: ManageCartState) {
    const cart = cartState?.cart;

    // Warning banner is only relevant in edit-cart mode (cart linked to an order/quote).
    // On a standalone cart page there is no prior tax calculation to go stale.
    const businessObjectId = get(cart, 'BusinessObjectId');
    if (!businessObjectId) {
      this.showTaxWarning = false;
      return;
    }

    // Check whether the repriced cart still contains a Sales Tax summary group.
    const hasTaxInSummary = !!find(get(cart, 'SummaryGroups', []), group =>
      get(group, 'ChargeType', '').toLowerCase() === 'sales tax'
    );

    if (hasTaxInSummary) {
      // Tax is present in the cart — keep taxCalculated in sync.
      this.taxCalculated = true;
    } else if (this.taxCalculated && !this.taxLoader) {
      // Tax was calculated before but the cart was repriced (product added/removed)
      // and the tax row is now gone — prompt the user to recalculate.
      this.showTaxWarning = true;
    }
  }

  navigateToProducts() {
    this.router.navigate(['/products']);
  }

  trackById(index, record): string {
    return get(record, 'MainLine.Id');
  }

  refreshCart(fieldValue, cart, fieldName) {
    set(cart, fieldName, fieldValue);
    const payload = {
      "Name": fieldValue
    }

    this.subscription.push(this.cartService.updateCartById(cart.Id, payload).subscribe(r => {
      this.cart = r;
      this.view$.value.headerInfo = Object.assign(new Cart(), {
        Id: this.cart.Id,
        Name: this.cart.Name
      });
    }))
  }
  convertCartToQuote(quote: Quote) {
    this.quoteService.convertCartToQuote(quote).pipe(take(1)).subscribe(
      res => {
        this.loading = false;
        this.quoteConfirmation = res;
        this.ngZone.run(() => {
          this.router.navigate(['/proposals', this.quoteConfirmation.Id]);
        });
      },
      err => {
        this.loading = false;
      }
    );
  }

  searchChange() {
    if (this.searchText.length > 2) {
      forEach(this.view$.value.lineItems, (lineItem) => {
        let lowercaseSearchTerm = lowerCase(get(lineItem, 'MainLine.Name'));
        if (lowercaseSearchTerm) {
          if (lowercaseSearchTerm.indexOf(lowerCase(this.searchText)) > -1) {
            lineItem.MainLine.set('hide', false);
          }
          else {
            lineItem.MainLine.set('hide', true);
          }
        }
      });
    } else {
      forEach(this.view$.value.lineItems, (lineItem) => {
        lineItem.MainLine.set('hide', false);
      });
    }
  }

  openCloneCartModal() {
    this.cartName = `Clone of ${this.cart.Name}`
    this.modalRef = this.modalService.show(this.cloneCartTemplate);
  }

  closeCloneCartModal() {
    this.cartName = '';
    this.modalRef.hide()
  }

  cloneCart() {
    this.loading = true;
    if (this.cartName) {
      this.cart.Name = this.cartName
    }
    this.cartService.cloneCart(this.cart.Id, pick(this.cart, ['Name']) as Cart, true, true).pipe(take(1)).subscribe(
      res => {
        this.loading = false;
        this.modalRef.hide();
        this.exceptionService.showSuccess('SUCCESS.CART.CLONE_CART_SUCCESS');
      },
      err => {
        this.loading = false;
        this.exceptionService.showError('MY_ACCOUNT.CART_LIST.CART_CREATION_FAILED');
      }
    );
  }

  openNav() {
    this.showSideNav = true;
  }

  /* Set the width of the side navigation to 0 */
  closeNav() {
    this.showSideNav = false;
  }

  // Called when the user explicitly clicks the "Calculate Tax" button.
  // Shows the loading spinner and all validation errors (including missing postal code).
  calculateTax() {
    this.taxLoader = true;
    this.subscription.push(this.doCalculateTax().subscribe(
      () => {
        this.taxLoader = false;
        this.onTaxSuccess();
      },
      (err) => {
        this.taxLoader = false;
        this.onTaxError(err, { showMissingPostalCodeError: true });
      }
    ));
  }

  // Called automatically when navigating from order/quote detail to edit line items.
  // Runs silently — no spinner, and the postal code error is suppressed to avoid
  // interrupting the user with an error they didn't trigger.
  autoCalculateTax() {
    this.subscription.push(this.doCalculateTax().subscribe(
      () => this.onTaxSuccess(),
      (err) => this.onTaxError(err, { showMissingPostalCodeError: false })
    ));
  }

  private onTaxSuccess() {
    this.taxCalculated = true;
    this.showTaxWarning = false;
    this.showTaxCalculating = false;
    if (this.cart?.Id) {
      CartDetailComponent.lastTaxCalculatedCartId = this.cart.Id;
    }
    this.getCart();
  }

  private onTaxError(err: any, options: { showMissingPostalCodeError: boolean }) {
    this.showTaxCalculating = false;
    if (get(err, 'missingPostalCode')) {
      // Only show the postal code error when triggered by the user (not auto-calculate).
      if (options.showMissingPostalCodeError) {
        this.exceptionService.showError('TAX.ACCOUNT_MISSING_POSTAL_CODE');
      }
    } else {
      this.exceptionService.showError(err);
    }
  }

  // Resolves the ship-to account address and calls the tax API, then reprices the cart.
  // Returns an Observable so callers (calculateTax / autoCalculateTax) can handle
  // success and error independently.
  private doCalculateTax(): Observable<Cart> {
    const view = this.view$.value;
    const businessObject = view?.orderOrQuote;
    const cart = view?.cart;

    // Resolve ship-to account: prefer cart's ShipToAccount, fall back to
    // order/quote account fields, then the cart's own Account.
    const shipToAccountId = get(cart, 'ShipToAccount.Id') || get(businessObject, 'ShipToAccount.Id')
      || get(businessObject, 'SoldToAccount.Id') || get(businessObject, 'BillToAccount.Id')
      || get(cart, 'Account.Id');

    if (!shipToAccountId) {
      this.taxLoader = false;
      this.showTaxCalculating = false;
      return of(null);
    }

    return this.accountService.getAccount(shipToAccountId).pipe(
      take(1),
      switchMap((account) => {
        const postalCode = (get(account, 'ShippingPostalCode', '') || '').toString();
        if (!postalCode) {
          // Postal code is required for tax calculation — surface as a structured error
          // so callers can decide whether to show the error toast.
          return throwError(() => ({ missingPostalCode: true }));
        }
        const address: TaxAddress = {
          Line1: get(account, 'ShippingStreet', ''),
          Line2: '',
          City: get(account, 'ShippingCity', ''),
          Region: get(account, 'ShippingState', ''),
          Country: get(account, 'ShippingCountry', ''),
          PostalCode: postalCode
        };
        return this.integrationService.calculateTax(cart.Id, this.businessObjectType, address);
      }),
      // Reprice the cart after tax is applied so totals reflect the new tax amount.
      switchMap(() => this.cartService.priceCart())
    );
  }

  ngOnDestroy() {
    if (!isNil(this.subscription))
      this.subscription.forEach(subscription => subscription.unsubscribe());
  }
}
export interface ManageCartState {
  cart: Cart;
  lineItems: Array<ItemGroup>;
  orderOrQuote: Order | Quote;
  productList: Array<ItemRequest>;
  headerInfo: Cart;
}