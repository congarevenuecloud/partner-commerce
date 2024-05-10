import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { get, set, isEmpty, forEach, omit, map as _map } from 'lodash';
import { Favorite, FavoriteService, LineItemService, ItemGroup, User, UserService, FavoriteScope, Cart, CartService, CartItem } from '@congarevenuecloud/ecommerce';
import { ExceptionService } from '@congarevenuecloud/elements';
import { plainToClass } from 'class-transformer';
@Component({
  selector: 'app-favorite-detail',
  templateUrl: './favorite-detail.component.html',
  styleUrls: ['./favorite-detail.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class FavoriteDetailComponent implements OnInit, OnDestroy {

  constructor(private activatedRoute: ActivatedRoute,
    private favoriteService: FavoriteService,
    private userService: UserService,
    private cartService: CartService,
    private exceptionService: ExceptionService) { }

  favorite$: BehaviorSubject<Favorite> = new BehaviorSubject<Favorite>(null);

  lineItems$: BehaviorSubject<Array<ItemGroup>> = new BehaviorSubject<Array<ItemGroup>>(null);

  user$: Observable<User>;

  subscriptions: Array<Subscription> = new Array();

  isLoading: boolean = false;

  cart: Cart;

  favoriteScopes = [FavoriteScope.Private, FavoriteScope.Public];

  ngOnInit() {
    this.user$ = this.userService.getCurrentUser();
    this.getFavorite();
  }

  private getFavorite() {
    this.subscriptions.push(this.activatedRoute.params.pipe(
      filter(params => get(params, 'id') != null),
      map(params => get(params, 'id')),
      switchMap(favoriteId => this.favoriteService.getFavoriteById(favoriteId)),
      switchMap(res => {
        this.getFavoriteItems(get(res, 'ProductConfiguration.Id'));
        return of(res);
      })
    ).subscribe((favorite: Favorite) => {
      this.favorite$.next(favorite);
    }));
  }

  addFavoriteToCart(favorite: Favorite) {
    this.isLoading = true;
    this.subscriptions.push(this.favoriteService.addFavoriteToCart(favorite.Id)
      .subscribe(() => {
        this.isLoading = false;
        this.exceptionService.showSuccess('SUCCESS.FAVORITE.ADD_FAVORITE_TO_CART', 'SUCCESS.FAVORITE.TITLE', { name: favorite.Name });
      },
        (err) => this.exceptionService.showError(err)
      ));
  }

  updateFavorite(fieldValue, favorite, fieldName) {
    set(favorite, fieldName, fieldValue);
    this.subscriptions.push(this.favoriteService.updateFavorite(favorite).subscribe(c => this.favorite$.next(c)));
  }

  private getFavoriteItems(configurationId: string) {
    this.subscriptions.push(this.favoriteService.getFavoriteConfguration(configurationId)
      .subscribe(res => {
        this.cart = res;
        const cartItems = plainToClass(CartItem, get(res, 'Items'), { ignoreDecorators: true });
        let lines = LineItemService.groupItems(cartItems as unknown as CartItem[]);
        /* TODO: Revisit displaying promotions on the favorite details page
         * This feature will be reinstated once support for adjustment is implemented in the favorite details API [CPQ-81647]
         */
        lines = _map(lines, obj => omit(obj, ['MainLine.IncentiveAdjustmentAmount']) as ItemGroup);
        this.lineItems$.next(lines);
      }));
  }

  ngOnDestroy() {
    if (!isEmpty(this.subscriptions)) {
      forEach(this.subscriptions, item => item.unsubscribe());
    }
  }

}
