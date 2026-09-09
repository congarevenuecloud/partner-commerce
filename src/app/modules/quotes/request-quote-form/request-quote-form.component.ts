import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { Observable, of, combineLatest } from 'rxjs';
import { take, switchMap } from 'rxjs/operators';
import { get } from 'lodash';
import { FilterOperator } from '@congarevenuecloud/core';
import { AccountService, UserService, Quote, QuoteService, PriceListService, Cart, Account, Contact, PriceList, StorefrontService, AccountLocationManagementService } from '@congarevenuecloud/ecommerce';
import { LookupOptions } from '@congarevenuecloud/elements';

@Component({
  selector: 'app-request-quote-form',
  templateUrl: './request-quote-form.component.html',
  styleUrls: ['./request-quote-form.component.scss'],
  standalone: false
})
export class RequestQuoteFormComponent implements OnInit {
  @Input() cart: Cart;
  @Output() onQuoteUpdate = new EventEmitter<Quote>();

  quote = new Quote();
  bsConfig: Partial<BsDatepickerConfig>;
  startDate: Date = new Date();
  rfpDueDate: Date = new Date();

  billToAccount$: Observable<Account>;
  priceList$: Observable<PriceList>;
  lookupOptions: LookupOptions = {
    primaryTextField: 'Name',
    secondaryTextField: 'Email',
    fieldList: ['Id', 'Name', 'Email']
  };
  partnerAccountLookupOptions: LookupOptions = {
    primaryTextField: 'Name',
    fieldList: ['Id', 'Name'],
    filters: [{
      field: 'IsPartner',
      value: true,
      filterOperator: FilterOperator.EQUAL
    }]
  };
  partnerAccount: Account = null;
  contact: Contact;

  constructor(public quoteService: QuoteService,
    private accountService: AccountService,
    private userService: UserService,
    private plservice: PriceListService,
    private accountLocationService: AccountLocationManagementService,
    private storefrontService: StorefrontService) { }

  ngOnInit() {
    combineLatest(this.accountService.getCurrentAccount(), this.userService.me(), (this.cart.Proposald ? this.quoteService.getQuoteById(get(this.cart, 'Proposald.Id')) : of(null)), this.storefrontService.getStorefront())
      .pipe(
        take(1),
        switchMap(([account, user, quote, storefront]) => {
          // A reopened proposal returns Location as Id/Name only; hydrate the full AccountLocation before any emit so tax has its address.
          const reopenedQuote = get(this.cart, 'Proposald.Id') ? (get(quote, '[0]') || get(this.cart, 'Proposald')) : null;
          const locationId = get(reopenedQuote, 'Location.Id');
          const location$ = (locationId && !get(reopenedQuote, 'Location.Location.Id')) ? this.accountLocationService.getAccountLocationById(locationId) : of(null);
          return combineLatest([of(account), of(quote), location$]);
        })
      ).subscribe(([account, quote, hydratedLocation]) => {
        this.quote.ProposalName = 'New Quote';
        this.quote.Account = get(this.cart, 'Account');
        this.quote.PrimaryContact = null;
        this.quote.SourceChannel = "Partner";
        this.contact = null;
        if (get(this.cart, 'Proposald.Id')) {
          this.quote = get(quote, '[0]') || get(this.cart, 'Proposald');
          this.contact = get(this.quote, 'PrimaryContact');
          if (hydratedLocation) {
            this.quote.Location = hydratedLocation;
          }
        }
        if (account) {
          // Ship To and Bill To are the same locked app-level account.
          this.quote.ShipToAccount = account;
          this.quote.BillToAccount = account;
          // billToAccount$ feeds <apt-address>, which needs the full account record (address fields) fetched by Id.
          this.billToAccount$ = this.accountService.getAccount(get(account, 'Id'));
          this.lookupOptions.filters = [{ field: 'Account.Id', value: get(account, 'Id'), filterOperator: FilterOperator.EQUAL }];
        }
        this.quoteChange();
        this.getPriceList();
      });
  }

  quoteChange() {
    this.onQuoteUpdate.emit(this.quote);
  }

  onShippingLocationChange() {
    this.onQuoteUpdate.emit(this.quote);
  }

  getPriceList() {
    this.priceList$ = this.plservice.getPriceList();
    this.priceList$.pipe(take(1)).subscribe((newPricelList) => {
      this.quote.PriceList = newPricelList;
      this.onQuoteUpdate.emit(this.quote);
    });
  }

  primaryContactChange() {
    // Ship To / Bill To stay locked to the app-level account; only sync the selected contact.
    this.quote.PrimaryContact = this.contact;
    this.onQuoteUpdate.emit(this.quote);
  }

  partnerAccountChange() {
    this.quote.PartnerAccount = this.partnerAccount;
    this.onQuoteUpdate.emit(this.quote);
  }
}