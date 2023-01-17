import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { Observable, of, combineLatest } from 'rxjs';
import { take } from 'rxjs/operators';
import { get } from 'lodash';
import { AccountService, ContactService, UserService, Quote, QuoteService, PriceListService, Cart, Account, Contact, PriceList } from '@congarevenuecloud/ecommerce';
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
  contact: string;

  constructor(public quoteService: QuoteService,
    private accountService: AccountService,
    private userService: UserService,
    private plservice: PriceListService,
    private contactService: ContactService) { }

  ngOnInit() {
    combineLatest(this.accountService.getCurrentAccount(), this.userService.me(), (this.cart.Proposald ? this.quoteService.getQuoteById(get(this.cart, 'Proposald.Id')) : of(null)))
      .pipe(take(1)).subscribe(([account, user, quote]) => {
        this.quote.ProposalName = 'New Quote';
        this.quote.ShipToAccount = account;
        this.quote.BillToAccount = account;
        this.quote.Account = get(this.cart, 'Account');
        this.quote.PrimaryContact = get(user, 'Contact');
        this.contact = this.cart.Proposald ? get(quote[0], 'PrimaryContact.Id') : get(user, 'Contact.Id');
        if (get(this.cart, 'Proposald.Id')) {
          this.quote = get(this.cart, 'Proposal');
        }
        this.quoteChange();
        this.getPriceList();
      });
  }

  quoteChange() {
    this.onQuoteUpdate.emit(this.quote);
  }

  shipToChange() {
    if (get(this.quote.ShipToAccount, 'Id'))
      this.shipToAccount$ = this.accountService.getAccount(this.quote.ShipToAccount.Id);
  }

  billToChange() {
    if (get(this.quote.BillToAccount, 'Id'))
      this.billToAccount$ = this.accountService.getAccount(this.quote.BillToAccount.Id);

  }
  getPriceList() {
    this.priceList$ = this.plservice.getPriceList();
    this.priceList$.pipe(take(1)).subscribe((newPricelList) => {
      this.quote.PriceList = newPricelList;
      this.onQuoteUpdate.emit(this.quote);
    });
  }

  primaryContactChange() {
    if (get(this.contact, 'Id')) {
      this.contactService.fetch(get(this.contact, 'Id'))
        .pipe(take(1))
        .subscribe((newPrimaryContact: Contact) => {
          this.quote.PrimaryContact = newPrimaryContact;
          this.onQuoteUpdate.emit(this.quote);
        });
    } else {
      this.quote.PrimaryContact = null;
      this.onQuoteUpdate.emit(this.quote);
    }
  }
}