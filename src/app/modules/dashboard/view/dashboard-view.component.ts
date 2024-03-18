import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { first, defaultTo } from 'lodash';
import { UserService, Quote, User, Cart, CartService, StorefrontService } from '@congarevenuecloud/ecommerce';

@Component({
  selector: 'app-dashboard-view',
  templateUrl: './dashboard-view.component.html',
  styleUrls: ['./dashboard-view.component.scss']
})
export class DashboardViewComponent implements OnInit {

  type = Quote;
  me$: Observable<User>;
  cart$: Observable<Cart>;
  showFavorites$: Observable<boolean>;
  userInitials: string = null;

  constructor(private userService: UserService,
    private cartService: CartService,
    private storefrontService: StorefrontService) { }

  ngOnInit() {
    this.showFavorites$ = this.storefrontService.isFavoriteEnabled();
    this.me$ = this.userService.me().pipe(
      tap((user: User) => {
        this.userInitials = defaultTo(first(user.FirstName), '') + defaultTo(first(user.LastName), '');
      })
    );
  }

}