import { Component, OnInit, TemplateRef, ViewChild, NgZone, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, combineLatest, of, throwError } from 'rxjs';
import { map, switchMap, take, filter as _filter, debounceTime, catchError } from 'rxjs/operators';
import { filter, find, forEach, get, isEqual, isNil, isNull, lowerCase, pick, set } from 'lodash';
import { BsModalService } from 'ngx-bootstrap/modal';
import { plainToClass } from 'class-transformer';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Cart, CartItem, CartService, LineItemService, Order, Quote, ItemGroup, QuoteService, ConstraintRuleService, OrderService, ItemRequest, IntegrationService, TaxAddress, AccountService } from '@congarevenuecloud/ecommerce';
import { BatchActionService, RevalidateCartService, ExceptionService, ButtonAction, BatchSelectionService } from '@congarevenuecloud/elements';
import { DsrService } from '../../../services/dsr.service';


@Component({
    selector: 'app-cart-detail',
    templateUrl: './cart-detail.component.html',
    styleUrls: ['./cart-detail.component.scss'],
    standalone: false
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
  taxState: 'idle' | 'calculating' | 'calculating-manual' | 'calculated' | 'stale' = 'idle';
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
    private accountService: AccountService,
    private cdr: ChangeDetectorRef,
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
      // When the component is recreated after SPA navigation (e.g. catalog → back to cart),
      // restore taxState to 'stale' if tax was previously calculated for this cart.
      const cartId = get(cartState, 'cart.Id');
      if (this.taxState === 'idle' && cartId && get(cartState, 'cart.BusinessObjectId')
        && CartDetailComponent.lastTaxCalculatedCartId === cartId) {
        this.taxState = 'stale';
      }
      this.autoTriggerTaxIfNeeded();
      this.trackLineItemChanges(cartState);
    }));
  }

  private autoTriggerTaxIfNeeded() {
    if (this.taxState !== 'idle' || !this.isTaxEnabled) return;
    const cart = this.view$.value?.cart;
    if (!get(cart, 'BusinessObjectId')) return;
    const navState = history.state;
    if (navState?.autoTax) {
      history.replaceState({ ...navState, autoTax: false }, '', window.location.href);
      this.taxState = 'calculating';
      this.autoCalculateTax();
    }
  }

  private trackLineItemChanges(cartState: ManageCartState) {
    const cart = cartState?.cart;
    if (!get(cart, 'BusinessObjectId')) return;
    const hasTaxInSummary = !!find(get(cart, 'SummaryGroups', []), summaryGroup =>
      get(summaryGroup, 'ChargeType', '').toLowerCase() === 'sales tax'
    );
    if (hasTaxInSummary) {
      this.taxState = 'calculated';
    } else if (this.taxState === 'calculated') {
      this.taxState = 'stale';
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
        this.cdr.detectChanges();
      },
      err => {
        this.loading = false;
        this.exceptionService.showError('MY_ACCOUNT.CART_LIST.CART_CREATION_FAILED');
        this.cdr.detectChanges();
      }
    );
  }

  openNav() {
    this.showSideNav = true;
  }

  dismissTaxWarning() {
    this.taxState = 'idle';
  }

  /* Set the width of the side navigation to 0 */
  closeNav() {
    this.showSideNav = false;
  }

  calculateTax() {
    this.taxState = 'calculating-manual';
    this.subscription.push(this.doCalculateTax().subscribe(
      () => this.onTaxSuccess(),
      (err) => this.onTaxError(err, { showMissingPostalCodeError: true })
    ));
  }

  autoCalculateTax() {
    this.subscription.push(this.doCalculateTax().subscribe(
      () => this.onTaxSuccess(),
      (err) => this.onTaxError(err, { showMissingPostalCodeError: false })
    ));
  }

  private onTaxSuccess() {
    this.taxState = 'calculated';
    CartDetailComponent.lastTaxCalculatedCartId = get(this.view$.value, 'cart.Id') ?? null;
  }

  private onTaxError(err: any, options: { showMissingPostalCodeError: boolean }) {
    this.taxState = 'idle';
    if (get(err, 'missingPostalCode')) {
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
      this.taxState = 'idle';
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

  isTaxState(state: string): boolean {
    return this.taxState === state;
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