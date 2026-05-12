import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { Observable, of, combineLatest } from 'rxjs';
import { take, map, shareReplay } from 'rxjs/operators';
import { get } from 'lodash';
import { FilterOperator } from '@congarevenuecloud/core';
import { AccountService, ContactService, UserService, Quote, QuoteService, PriceListService, Cart, Account, Contact, PriceList, StorefrontService } from '@congarevenuecloud/ecommerce';
import { LookupOptions } from '@congarevenuecloud/elements';

@Component({
  selector: 'app-request-quote-form',
  templateUrl: './request-quote-form.component.html',
  styleUrls: ['./request-quote-form.component.scss']
})
export class RequestQuoteFormComponent implements OnInit {
  @Input() cart: Cart;
  @Output() onQuoteUpdate = new EventEmitter<Quote>();

  quote = new Quote();
  bsConfig: Partial<BsDatepickerConfig>;
  startDate: Date = new Date();
  rfpDueDate: Date = new Date();

  shipToAccount$: Observable<Account>;
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
  private lastProcessedContactId: string = null;

  constructor(public quoteService: QuoteService,
    private accountService: AccountService,
    private userService: UserService,
    private plservice: PriceListService,
    private contactService: ContactService,
    private storefrontService: StorefrontService) { }

  ngOnInit() {
    combineLatest(this.accountService.getCurrentAccount(), this.userService.me(), (this.cart.Proposald ? this.quoteService.getQuoteById(get(this.cart, 'Proposald.Id')) : of(null)), this.storefrontService.getStorefront())
      .pipe(take(1)).subscribe(([account, user, quote, storefront]) => {
        this.quote.ProposalName = 'New Quote';
        this.quote.Account = get(this.cart, 'Account');
        this.quote.PrimaryContact = null;
        this.quote.SourceChannel = "Partner";
        this.contact = null;
        if (get(this.cart, 'Proposald.Id')) {
          this.quote = get(quote, '[0]') || get(this.cart, 'Proposald');
          this.contact = get(this.quote, 'PrimaryContact');
        }
        this.quoteChange();
        this.getPriceList();
      });
  }

  quoteChange() {
    this.onQuoteUpdate.emit(this.quote);
  }

  shipToChange() {
    if (get(this.quote.ShipToAccount, 'Id')) {
      this.shipToAccount$ = this.accountService.getAccount(get(this.quote.ShipToAccount, 'Id'));
      this.shipToAccount$.pipe(take(1)).subscribe((newShippingAccount) => {
        this.quote.ShipToAccount = newShippingAccount;
        this.onQuoteUpdate.emit(this.quote);
      });
    } else {
      this.quote.ShipToAccount = null;
      this.shipToAccount$ = null;
      this.onQuoteUpdate.emit(this.quote);
    }
  }

  billToChange() {
    if (get(this.quote.BillToAccount, 'Id')) {
      this.billToAccount$ = this.accountService.getAccount(get(this.quote.BillToAccount, 'Id'));
      this.billToAccount$.pipe(take(1)).subscribe((newBillingAccount) => {
        this.quote.BillToAccount = newBillingAccount;
        this.onQuoteUpdate.emit(this.quote);
      });
    } else {
      this.quote.BillToAccount = null;
      this.billToAccount$ = null;
      this.onQuoteUpdate.emit(this.quote);
    }
  }
  getPriceList() {
    this.priceList$ = this.plservice.getPriceList();
    this.priceList$.pipe(take(1)).subscribe((newPricelList) => {
      this.quote.PriceList = newPricelList;
      this.onQuoteUpdate.emit(this.quote);
    });
  }

  primaryContactChange() {
    if (!this.contact || !get(this.contact, 'Id')) {
      // Clear Bill To and Ship To when Primary Contact is cleared
      this.quote.PrimaryContact = null;
      this.quote.BillToAccount = null;
      this.quote.ShipToAccount = null;
      this.billToAccount$ = null;
      this.shipToAccount$ = null;
      this.lastProcessedContactId = null;
      this.onQuoteUpdate.emit(this.quote);
      return;
    }

    const contactId = get(this.contact, 'Id');
    
    // Skip if this contact ID was already processed to avoid redundant API calls
    if (contactId === this.lastProcessedContactId) {
      return;
    }
    
    // Check if contact already has Account data loaded
    const existingAccount = get(this.contact, 'Account');
    if (existingAccount && get(existingAccount, 'Id')) {
      // Account already loaded, just populate Bill To and Ship To
      this.quote.PrimaryContact = this.contact as any;
      this.quote.BillToAccount = existingAccount;
      this.quote.ShipToAccount = existingAccount;
      const acct$ = this.accountService.getAccount(get(existingAccount, 'Id')).pipe(shareReplay(1));
      this.billToAccount$ = acct$;
      this.shipToAccount$ = acct$;
      acct$.pipe(take(1)).subscribe(fullAccount => {
        this.quote.BillToAccount = fullAccount;
        this.quote.ShipToAccount = fullAccount;
        this.onQuoteUpdate.emit(this.quote);
      });
      this.lastProcessedContactId = contactId;
      return;
    }

    this.contactService.getContactById(contactId).pipe(take(1), map(fetchedContact => fetchedContact as Contact)).subscribe(fetchedContact => {
      if (fetchedContact) {
        // Update contact with full data including Account
        this.quote.PrimaryContact = fetchedContact;
        this.contact = fetchedContact;
        // Auto-populate BillToAccount and ShipToAccount from Primary Contact's Account
        const contactAccount = get(fetchedContact, 'Account');
        if (contactAccount && get(contactAccount, 'Id')) {
          this.quote.BillToAccount = contactAccount;
          this.quote.ShipToAccount = contactAccount;
          const acct$ = this.accountService.getAccount(get(contactAccount, 'Id')).pipe(shareReplay(1));
          this.billToAccount$ = acct$;
          this.shipToAccount$ = acct$;
          acct$.pipe(take(1)).subscribe(fullAccount => {
            this.quote.BillToAccount = fullAccount;
            this.quote.ShipToAccount = fullAccount;
            this.onQuoteUpdate.emit(this.quote);
          });
        } else {
          // If contact has no account, clear Bill To and Ship To
          this.quote.BillToAccount = null;
          this.quote.ShipToAccount = null;
          this.billToAccount$ = null;
          this.shipToAccount$ = null;
          this.onQuoteUpdate.emit(this.quote);
        }
        this.lastProcessedContactId = contactId;
      } else {
        this.lastProcessedContactId = null;
      }
    });
  }

  partnerAccountChange() {
    this.quote.PartnerAccount = this.partnerAccount;
    this.onQuoteUpdate.emit(this.quote);
  }
}