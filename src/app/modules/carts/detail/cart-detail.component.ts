import { Component, OnInit, TemplateRef, ViewChild, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, combineLatest, of } from 'rxjs';
import { map, switchMap, take, filter as _filter, debounceTime } from 'rxjs/operators';
import { filter, forEach, get, isEqual, isNil, isNull, lowerCase, pick, set } from 'lodash';
import { BsModalService } from 'ngx-bootstrap/modal';
import { plainToClass } from 'class-transformer';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { Cart, CartItem, CartService, LineItemService, Order, Quote, ItemGroup, QuoteService, ConstraintRuleService, OrderService, ItemRequest } from '@congarevenuecloud/ecommerce';
import { BatchActionService, RevalidateCartService, ExceptionService, ButtonAction, BatchSelectionService } from '@congarevenuecloud/elements';

@Component({
  selector: 'app-cart-detail',
  templateUrl: './cart-detail.component.html',
  styleUrls: ['./cart-detail.component.scss']
})

export class CartDetailComponent implements OnInit {
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
    public batchSelectionService: BatchSelectionService
  ) { }
  ngOnInit() {
    this.getCart();
  }

  getCart() {
    this.loading = false;
    this.subscription.push(combineLatest([
      this.cartService.getMyCart(),
      this.crService.getRecommendationsForCart(),
      this.cartService.isCartActive(get(this.activatedRoute.params, "_value.id")) ? of(null) : this.cartService.getCartWithId(get(this.activatedRoute.params, "_value.id")),
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
        return combineLatest([of(this.cart), this.businessObject$, of(products), this.readOnly ? this.cartService.addAdjustmentInfoToLineItems(this.cart?.Id) : of(null)]);
      }),
      switchMap(([cartInfo, businessObjectInfo, productsInfo, lineItemsWithIncentives]) => {
        if (this.readOnly && !isNil(lineItemsWithIncentives)) {
          cartInfo.LineItems = lineItemsWithIncentives;
        }
        const businessObjectType = get(cartInfo, 'BusinessObjectType');
        const proposalId = get(cartInfo, 'Proposald');
        const orderId = get(cartInfo, 'Order');
        if (isEqual(businessObjectType, 'Proposal')) {
          if (isNil(proposalId) || this.isCartFinalized) set(cartInfo, 'Proposald', businessObjectInfo);
        }
        else if (isNil(orderId) || this.isCartFinalized) {
          set(cartInfo, 'Order', businessObjectInfo);
        }
        const cartItems = this.readOnly ? plainToClass(CartItem, get(cartInfo, 'LineItems')) : get(cartInfo, 'LineItems');// plainToClass is added as the pricing, which internally does the operation, is not performed for nonactive carts
        return of({
          cart: cartInfo,
          lineItems: LineItemService.groupItems(cartItems),
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
    }));
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