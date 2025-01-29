import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { UserService, Quote, User, Cart, CartService, StorefrontService } from '@congarevenuecloud/ecommerce';

@Component({
  selector: 'app-dashboard-view',
  templateUrl: './dashboard-view.component.html',
  styleUrls: ['./dashboard-view.component.scss']
})
export class DashboardViewComponent implements OnInit {

  type = Quote;
  cart$: Observable<Cart>;
  showFavorites$: Observable<boolean>;
  userInitials: string = null;

  constructor(private userService: UserService,
    private cartService: CartService,
    private storefrontService: StorefrontService) { }

  ngOnInit() {
    this.showFavorites$ = this.storefrontService.isFavoriteEnabled();
  }

}