import { Component, OnInit, TemplateRef, ViewChild, ChangeDetectionStrategy, NgZone, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, combineLatest, of } from 'rxjs';
import { map, switchMap, take, filter as _filter } from 'rxjs/operators';
import { cloneDeep, each, filter, forEach, get, isEqual, isNil, isNull, lowerCase, set } from 'lodash';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Cart, CartItem, CartService, LineItemService, Product, Order, Quote, ItemGroup, QuoteService, ConstraintRuleService, OrderService, ItemRequest } from '@congarevenuecloud/ecommerce';
import { BatchActionService, RevalidateCartService, ExceptionService, ButtonAction } from '@congarevenuecloud/elements';
import { plainToClass } from 'class-transformer';
import { BsModalService } from 'ngx-bootstrap/modal';

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
  searchText: string;
  cartName: string;
  customButtonActions: Array<ButtonAction> = [
    {
      label: 'MY_ACCOUNT.CART_LIST.CLONE_CART',
      enabled: true,
      onClick: () => this.openCloneCartModal(),
    },
  ]
  showSideNav: boolean= false;
  constructor(private cartService: CartService,
    private quoteService: QuoteService,
    private orderService: OrderService,
    private router: Router,
    private ngZone: NgZone,
    private revalidateCartService: RevalidateCartService,
    private crService: ConstraintRuleService,
    private activatedRoute: ActivatedRoute,
    public batchActionService: BatchActionService,
    private cdr: ChangeDetectorRef,
    private modalService: BsModalService,
    private exceptionService: ExceptionService
  ) { }
  ngOnInit() {
    this.getCart();
  }

  getCart() {
    this.loading = false;
    this.subscription.push(combineLatest([
      this.cartService.getMyCart(),
      this.crService.getRecommendationsForCart(),
      get(this.activatedRoute.params, "_value.id") ? this.cartService.getCartWithId(get(this.activatedRoute.params, "_value.id")) : of(null),
      this.revalidateCartService.revalidateFlag
    ]).pipe(
      switchMap(([cart, products, nonActive, revalidateFlag]) => {
        this.disabled = revalidateFlag;
        this.readOnly = get(cart, 'Id') === get(nonActive, 'Id') || isNull(nonActive) ? false : true;
        if (this.readOnly) {
          this.batchActionService.setShowCloneAction(true);
        } else {
          this.batchActionService.setShowCloneAction(false);
        }
        cart = this.readOnly ? nonActive : cart;
        this.cart = cart;
        this.primaryLI = filter((get(cart, 'LineItems')), (i) => i.IsPrimaryLine && i.LineType === 'Product/Service');
        if (!isNil(get(cart, 'BusinessObjectId'))) {
          this.businessObject$ = isEqual(get(cart, 'BusinessObjectType'), 'Proposal') ?
            this.quoteService.getQuoteById(get(cart, 'BusinessObjectId'), false) : this.orderService.getOrder(get(cart, 'BusinessObjectId'));
        } else {
          this.businessObject$ = of(null);
        }
        return combineLatest([this.cartService.fetchCartStatus(get(this.cart,'Id')), this.businessObject$, of(products)]);
      }),
      switchMap(([cartInfo, businessObjectInfo, productsInfo]) => {
        isEqual(get(cartInfo, 'BusinessObjectType'), 'Proposal') ? set(cartInfo, 'Proposald', businessObjectInfo) : set(cartInfo, 'Order', businessObjectInfo);
        cartInfo.set('error',get(this.cart,'_metadata.error'));
        cartInfo.set('ConfigResponse',get(this.cart,'ConfigResponse'));
        const cartItems = get(cartInfo, 'LineItems');
        return of({
          cart: cartInfo,
          lineItems: LineItemService.groupItems(cartItems),
          orderOrQuote: isNil(get(cartInfo, 'Order')) ? get(cartInfo, 'Proposald') : get(cartInfo, 'Order'),
          productList: productsInfo
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
    delete this.cart.Status;
    this.cartService.cloneCart(this.cart.Id, this.cart, true, true).pipe(take(1)).subscribe(
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
    this.showSideNav= true;
  }
  
  /* Set the width of the side navigation to 0 */
  closeNav() {
    this.showSideNav=false;
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
}
