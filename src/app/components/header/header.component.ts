import {
  Component,
  OnInit,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, take, tap, filter, startWith, distinctUntilChanged, shareReplay, catchError } from 'rxjs/operators';
import { first, defaultTo, get, cloneDeep, isEqual, upperFirst } from 'lodash';
import {
  UserService,
  User,
  StorefrontService,
  Storefront,
  Cart,
  CartService,
  AccountService,
  Account,
  CollaborationRequestService,
  CollaborationRequest,
  IntegrationService,
} from '@congarevenuecloud/ecommerce';
import { ExceptionService } from '@congarevenuecloud/elements';
import { DsrService } from '../../services/dsr.service';
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnInit {
  pageTop: boolean = true;
  user$: Observable<User>;
  userInitials: string = null;
  storefront$: Observable<Storefront>;
  storeLogo$: Observable<string>;
  myAccount$: Observable<Account>;
  showFavorites$: Observable<boolean>;
  cartView$: BehaviorSubject<Cart> = new BehaviorSubject(null);
  showAccountHome: boolean = false;
  showAccountInfo: boolean = false;
  cart: Cart;
  loading: boolean = true;

  isReadOnlyCollaborationMode$: Observable<boolean>;
  isDsrMode$: Observable<boolean>;
  showMiniCart$: Observable<boolean>;
  hideMiniCartForRoute$: Observable<boolean>;
  showProductSearch$: Observable<boolean>;
  
  isRestrictedMode$: Observable<boolean>;
  isNormalMode$: Observable<boolean>;

  constructor(
    private userService: UserService,
    private storefrontService: StorefrontService,
    private cartService: CartService,
    private accountService: AccountService,
    private exceptionService: ExceptionService,
    private collaborationService: CollaborationRequestService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private dsrService: DsrService,
    private integrationService: IntegrationService
  ) {}

  ngOnInit() {
    const currentUrl$: Observable<string> = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    );

    this.hideMiniCartForRoute$ = currentUrl$.pipe(
      switchMap(url => {
        // Always hide on checkout
        if (url.includes('/checkout')) {
          return of(true);
        }
        
        // For request quote page, hide only if tax is enabled
        if (url.includes('/proposals/create')) {
          return this.integrationService.getTaxMetadata().pipe(
            map(metadata => get(metadata, 'EnableTaxIntegration', false)),
            catchError(() => of(false))
          );
        }
        
        return of(false);
      }),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.isReadOnlyCollaborationMode$ = currentUrl$.pipe(
      switchMap(url => {
        // For collaborative cart route - always hide header
        if (url.includes('/collaborative/cart')) {
          return of(true);
        }

        return of(false);
      })
    );

    // Initialize DSR mode observable
    this.isDsrMode$ = this.dsrService.getDsrState().pipe(
      map((state) => state.isDsrMode),
      shareReplay(1)
    );

    this.showMiniCart$ = combineLatest([
      this.isDsrMode$,
      currentUrl$
    ]).pipe(
      map(([isDsrMode, url]) => {
        if (!isDsrMode) {
          return true; // Always show in normal mode
        }
        
        // In DSR mode: hide on quote details, show on products/cart/checkout pages
        const isOnQuotePage = url.includes('/proposals/');
        return !isOnQuotePage;
      }),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.isRestrictedMode$ = combineLatest([
      this.isReadOnlyCollaborationMode$,
      this.isDsrMode$
    ]).pipe(
      map(([isCollabMode, isDsrMode]) => isCollabMode || isDsrMode),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.isNormalMode$ = this.isRestrictedMode$.pipe(
      map(isRestricted => !isRestricted),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    // Show product search in normal mode OR when in DSR FullEdit mode editing line items
    this.showProductSearch$ = this.dsrService.getDsrState().pipe(
      switchMap(state => {
        // Show in normal mode (not DSR, not restricted)
        if (!state.isDsrMode) {
          return of(true);
        }
        
        // In DSR mode with editing line items - check if FullEdit access
        if (state.isDsrMode && state.editedLineItems && state.quoteId) {
          return this.collaborationService.getCollaborationRequest('Proposal', state.quoteId).pipe(
            take(1),
            map((collabRequest: CollaborationRequest) => {
              // Show search only for FullEdit access
              return collabRequest?.AccessType === 'FullEdit';
            }),
            catchError(error => {
              return of(true);
            })
          );
        }
        
        // DSR mode but not editing - hide search
        return of(false);
      }),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.updateCartView();
    this.storefront$ = this.storefrontService.getStorefront();
    this.storeLogo$ = this.storefront$.pipe(
      switchMap((storefront: Storefront) => {
        if (storefront?.Logo) {
          return of(storefront as Storefront);
        } else {
          // Fallback to org-level logo
          return this.storefrontService.getConfigManagementSetting(
            'uithemes',
            'headersettings'
          );
        }
      }),
      map((response) =>
        get(response, response instanceof Storefront ? 'Logo' : 'logo', null)
      )
    );
    this.showFavorites$ = this.storefrontService.isFavoriteEnabled();
    this.user$ = this.userService.me().pipe(
      tap((user: User) => {
        this.userInitials = ((defaultTo(
          upperFirst(first(user.FirstName)),
          ''
        ) as string) +
          defaultTo(upperFirst(first(user.LastName)), '')) as string;
        user.FirstName = upperFirst(user.FirstName);
        user.LastName = upperFirst(user.LastName);
      })
    );
  }

  doLogout() {
    this.userService.logout();
  }

  updateCartView() {
    combineLatest([
      this.cartService.getMyCart(),
      this.accountService.getCurrentAccount(),
    ])
      .pipe(
        take(1),
        map(([cart, account]) => {
          cart.Account = account;
          this.cart = cart;
          this.cartView$.next(cloneDeep(cart));
        })
      )
      .subscribe();
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event) {
    this.pageTop = window.pageYOffset <= 0;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const clickedElement = event?.target as HTMLElement;
    const isArrowLeftOrUpdateAccount =
      clickedElement.closest('.back-icon') ||
      clickedElement.classList.contains('update-account');

    if (isArrowLeftOrUpdateAccount) this.showAccountInfo = false;
    else if (
      clickedElement.parentElement?.classList.contains('account-section') ||
      clickedElement.closest('.account-info') ||
      ['basicOption', 'ng-option'].some((className) =>
        clickedElement.classList.contains(className)
      )
    )
      return;
    else {
      this.showAccountHome = false;
      this.showAccountInfo = false;
      this.resetAccountSelection();
    }
  }

  toggleMyAccountDropdown(event?: Event): void {
    event.stopImmediatePropagation();
    this.showAccountHome = !this.showAccountHome;
  }

  loadAccountDetails(): void {
    this.showAccountInfo = true;
    this.showAccountHome = false;
  }

  navigateToAccountHome(): void {
    this.showAccountHome = true;
    this.showAccountInfo = false;
    this.resetAccountSelection();
  }

  resetAccountSelection(): void {
    if (
      !isEqual(
        get(this.cartView$, 'value.Account.Id'),
        get(this.cart, 'Account.Id')
      )
    )
      this.cartView$.value.Account = this.cart.Account;
  }

  updateAccountInfo(): void {
    const myAccountId = get(this.cartView$.value, 'Account.Id');
    if (myAccountId) {
      this.myAccount$ = this.accountService.getAccount(myAccountId).pipe(
        switchMap((account) => {
          this.cartView$.value.Account = account;
          this.loading = false;
          this.cdr.detectChanges();
          return of(account);
        })
      );
    }
  }

  saveAccountDetails(account: Account): void {
    this.accountService
      .setAccount(account)
      .pipe(take(1))
      .subscribe(() => {
        this.cart.Account = account;
        this.cdr.markForCheck();
        this.exceptionService.showSuccess(
          'HEADER.CHANGE_ACCOUNT_MESSAGE',
          'ACTION_BAR.CHANGE_ACCOUNT_TITLE'
        );
      });
  }
}
