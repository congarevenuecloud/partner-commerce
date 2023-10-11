import { Component, OnInit, TemplateRef, ViewChild, ChangeDetectionStrategy, NgZone, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { Observable, Subscription, combineLatest, of } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { filter, get, isEqual, isNil, isNull, set } from 'lodash';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Cart, CartItem, CartService, LineItemService, Product, Order, Quote, ItemGroup, QuoteService, ConstraintRuleService, OrderService } from '@congarevenuecloud/ecommerce';
import { BatchActionService, RevalidateCartService } from '@congarevenuecloud/elements';
import { plainToClass } from 'class-transformer';

@Component({
  selector: 'app-cart-detail',
  templateUrl: './cart-detail.component.html',
  styleUrls: ['./cart-detail.component.scss']
})

export class CartDetailComponent implements OnInit {
  @ViewChild('discardChangesTemplate') discardChangesTemplate: TemplateRef<any>;

  discardChangesModal: BsModalRef;
  view$: Observable<ManageCartState>;
  businessObject$: Observable<Order | Quote> = of(null);
  quoteConfirmation: Quote;
  confirmationModal: BsModalRef;
  loading: boolean = false;
  primaryLI: Array<CartItem> = [];
  readonly: boolean = false;
  cart: Cart;
  subscription: Subscription;
  disabled: boolean;

  constructor(private cartService: CartService,
    private quoteService: QuoteService,
    private orderService: OrderService,
    private router: Router,
    private ngZone: NgZone,
    private revalidateCartService: RevalidateCartService,
    private crService: ConstraintRuleService,
    private activatedRoute: ActivatedRoute,
    public batchActionService: BatchActionService,
  ) { }
  ngOnInit() {
    this.getCart();
  }

  getCart() {
    this.loading = false;
    this.view$ = combineLatest([
      this.cartService.getMyCart(),
      this.crService.getRecommendationsForCart(), get(this.activatedRoute.params, "_value.id") ? this.cartService.getCartWithId(get(this.activatedRoute.params, "_value.id")) : of(null),
      this.revalidateCartService.revalidateFlag]).pipe(
        switchMap(([cart, products, nonActive, revalidateFlag]) => {
          this.disabled = revalidateFlag;
          this.readonly = get(cart, 'Id') === get(nonActive, 'Id') || isNull(nonActive) ? false : true;
          if (this.readonly) {
            this.batchActionService.setShowCloneAction(true);
          } else {
            this.batchActionService.setShowCloneAction(false);
          }
          cart = this.readonly ? nonActive : cart;
          this.cart = cart;
          this.primaryLI = filter((get(cart, 'LineItems')), (i) => i.IsPrimaryLine && i.LineType === 'Product/Service');
          if (!isNil(get(cart, 'BusinessObjectId'))) {
            this.businessObject$ = isEqual(get(cart, 'BusinessObjectType'), 'Proposal') ?
              this.quoteService.getQuoteById(get(cart, 'BusinessObjectId'), false) : this.orderService.getOrder(get(cart, 'BusinessObjectId'));
          }
          return combineLatest([of(cart), this.businessObject$, of(products)]);
        }),
        switchMap(([cartInfo, businessObjectInfo, productsInfo]) => {
          isEqual(get(cartInfo, 'BusinessObjectType'), 'Proposal') ? set(cartInfo, 'Proposald', businessObjectInfo) : set(cartInfo, 'Order', businessObjectInfo);
          const cartItems = get(cartInfo, 'LineItems');
          return of({
            cart: cartInfo,
            lineItems: LineItemService.groupItems(cartItems),
            orderOrQuote: isNil(get(cartInfo, 'Order')) ? get(cartInfo, 'Proposald') : get(cartInfo, 'Order'),
            productList: productsInfo
          } as ManageCartState);
        })
      );
  }

  trackById(index, record): string {
    return get(record, 'MainLine.Id');
  }

  refreshCart(fieldValue, cart, fieldName) {
    set(cart, fieldName, fieldValue);
    const payload = {
      "Name": fieldValue
    }

    this.subscription = this.cartService.updateCartById(cart.Id, payload).subscribe(r => {
      this.cart = r;
    })
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


  ngOnDestroy() {
    if (!isNil(this.subscription))
      this.subscription.unsubscribe();
  }
}
export interface ManageCartState {
  cart: Cart;
  lineItems: Array<ItemGroup>;
  orderOrQuote: Order | Quote;
  productList: Array<Product>;
}
