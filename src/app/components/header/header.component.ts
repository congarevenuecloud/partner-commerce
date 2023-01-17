import { Component, OnInit, HostListener, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { first, defaultTo } from 'lodash';
import { UserService, User, CartService, StorefrontService, Storefront, AccountService } from '@congarevenuecloud/ecommerce';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent implements OnInit {

  pageTop: boolean = true;
  user$: Observable<User>;
  userInitials: string = null;
  storefront$: Observable<Storefront>;

  constructor(private userService: UserService, private authService: MsalService, private cartService: CartService, private storefrontService: StorefrontService, private accountService: AccountService) {
  }

  ngOnInit() {
    this.user$ = this.userService.me().pipe(
      tap((user: User) => {
        this.userInitials = defaultTo(first(user.FirstName), '') + defaultTo(first(user.LastName), '');
      })
    );
    this.userService.refresh();
    this.storefront$= this.storefrontService.getStorefront();
  }

  doLogout() {
    this.authService.instance.logoutRedirect({ 
      authority: environment.endpoint,
      postLogoutRedirectUri : window.location.origin + window.location.pathname
    });
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event) {
    this.pageTop = window.pageYOffset <= 0;
  }
}