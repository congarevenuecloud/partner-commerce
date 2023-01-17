import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { first, get, isNil, find, forEach, maxBy, filter, last, defaultTo } from 'lodash';
import { combineLatest, Observable, Subscription, of, BehaviorSubject } from 'rxjs';
import { switchMap, map as rmap, distinctUntilChanged } from 'rxjs/operators';
import {
  CartService,
  CartItem,
  Product,
  ProductService,
  ProductInformation,
  StorefrontService,
  Storefront,
  PriceListItemService,
  Cart
} from '@congarevenuecloud/ecommerce';
import { ProductConfigurationComponent, ProductConfigurationSummaryComponent, ProductConfigurationService } from '@congarevenuecloud/elements';
@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})

export class ProductDetailComponent implements OnInit, OnDestroy {

  viewState$: BehaviorSubject<ProductDetailsState> = new BehaviorSubject<ProductDetailsState>(null);
  recommendedProducts$: Observable<Array<Product>>;
  attachments$: Observable<Array<ProductInformation>>;

  cartItemList: Array<CartItem>;
  product: Product;
  subscriptions: Array<Subscription> = new Array<Subscription>();
  configurationChanged: boolean = false;
  currentQty: number;
  relatedTo: CartItem;
  cart: Cart;
  netPrice: number = 0;
  priceInProgress: boolean = false;

  @ViewChild(ProductConfigurationSummaryComponent, { static: false })
  configSummaryModal: ProductConfigurationSummaryComponent;
  @ViewChild(ProductConfigurationComponent, { static: false })
  productConfigComponent: ProductConfigurationComponent;

  constructor(private cartService: CartService,
    private router: Router,
    private route: ActivatedRoute,
    private productService: ProductService,
    private storefrontService: StorefrontService,
    private productConfigurationService: ProductConfigurationService) {
  }

  ngOnInit() {
    this.subscriptions.push(this.route.params.pipe(
      switchMap(params => {
        this.productConfigurationService.onChangeConfiguration(null);
        this.product = null;
        this.cartItemList = null;
        const product$ = (this.product instanceof Product && get(params, 'id') === this.product.Id) ? of(this.product) :
          this.productService.fetch(get(params, 'id'));
        const cartItem$ = this.cartService.getMyCart().pipe(
          rmap(cart => {
            this.cart = cart;
            return find(get(cart, 'LineItems'), { Id: get(params, 'cartItem') })
          }),
          distinctUntilChanged((oldCli, newCli) => get(newCli, 'Quantity') === this.currentQty)
        );
        return combineLatest([product$, cartItem$, this.storefrontService.getStorefront()]);
      }),
      rmap(([product, cartItemList, storefront]) => {
        const pli = PriceListItemService.getPriceListItemForProduct(product as Product);
        this.currentQty = isNil(cartItemList) ? defaultTo(get(pli, 'DefaultQuantity'), 1) : get(cartItemList, 'Quantity', 1);
        this.productConfigurationService.changeProductQuantity(this.currentQty);
        this.product = product as Product;
        return {
          product: product as Product,
          relatedTo: cartItemList,
          quantity: this.currentQty,
          storefront: storefront
        };
      })
    ).subscribe(r => this.viewState$.next(r)));

    this.subscriptions.push(this.productConfigurationService.configurationChange.subscribe(response => {
      if (get(response, 'configurationChanged')) this.configurationChanged = true;
      this.netPrice = defaultTo(get(response, 'netPrice'), 0);
      this.relatedTo = get(this.viewState$, 'value.relatedTo');
      this.product = get(response, 'product') ? get(response, 'product') : this.product;
      this.cartItemList = get(response, 'itemList');
    }));
  }

  onConfigurationChange(result: any) {
    this.product = first(result);
    this.cartItemList = result[1];
    if (get(last(result), 'optionChanged') || get(last(result), 'attributeChanged')) this.configurationChanged = true;
  }

  handleStartChange(cartItem: CartItem) {
    this.cartService.updateCartItems([cartItem]);
  }

  onAddToCart(cartItems: Array<CartItem>): void {
    this.configurationChanged = false;
    const primaryItem = find(cartItems, i => get(i, 'IsPrimaryLine') === true && isNil(get(i, 'Option')));
    if (!isNil(primaryItem) && (get(primaryItem, 'Product.HasOptions') || get(primaryItem, 'Product.HasAttributes'))) {
      this.router.navigate(['/products', get(this, 'product.Id'), get(primaryItem, 'Id')]);
    }

    if (get(cartItems, 'LineItems') && this.viewState$.value.storefront.ConfigurationLayout === 'Embedded') {
      cartItems = get(cartItems, 'LineItems');
    }

    if (!isNil(this.relatedTo) && (get(this.relatedTo, 'HasOptions') || get(this.relatedTo, 'HasAttributes')))
      this.router.navigate(['/products', get(this.viewState$, 'value.product.Id'), get(this.relatedTo, 'Id')]);

    this.productConfigurationService.onChangeConfiguration({
      product: get(this, 'product'),
      itemList: cartItems,
      configurationChanged: false,
      hasErrors: false
    });
  }

  changeProductQuantity(newQty: any) {
    if (this.cartItemList && this.cartItemList.length > 0)
      forEach(this.cartItemList, c => {
        if (c.LineType === 'Product/Service') c.Quantity = newQty;
        this.productConfigurationService.changeProductQuantity(newQty);
      });
  }

  handleEndDateChange(cartItem: CartItem) {
    this.cartService.updateCartItems([cartItem]);
  }

  showSummary() {
    this.configSummaryModal.show();
  }

  getPrimaryItem(cartItems: Array<CartItem>): CartItem {
    let primaryItem: CartItem;
    if (isNil(this.relatedTo)) {
      primaryItem = maxBy(filter(cartItems, i => get(i, 'LineType') === 'Product/Service' && isNil(get(i, 'Option')) && get(this, 'product.Id') === get(i, 'ProductId')), 'PrimaryLineNumber');
    }
    else {
      primaryItem = find(cartItems, i => get(i, 'LineType') === 'Product/Service' && i.PrimaryLineNumber === get(this, 'relatedTo.PrimaryLineNumber') && isNil(get(i, 'Option')));
    }
    return primaryItem;
  }

  ngOnDestroy() {
    forEach(this.subscriptions, item => {
      if (item) item.unsubscribe();
    });
  }
}

export interface ProductDetailsState {
  // The product to display.
  product: Product;
  // The CartItem related to this product.
  relatedTo: CartItem;
  // Quantity to set to child components
  quantity: number;
  // The storefront.
  storefront: Storefront;
}
