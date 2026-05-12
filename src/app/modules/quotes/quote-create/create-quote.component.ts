import { Component, OnInit, ViewChild, TemplateRef, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { get, set, find, defaultTo, isEmpty } from 'lodash';
import { Quote, QuoteService, Storefront, Cart, CartService, AccountService, Account, TaxAddress } from '@congarevenuecloud/ecommerce';

@Component({
  selector: 'app-create-quote',
  templateUrl: `./create-quote.component.html`,
  styles: []
})
export class CreateQuoteComponent implements OnInit {
  @ViewChild('confirmationTemplate') confirmationTemplate: TemplateRef<any>;

  cart$: Observable<Cart>;
  storefront$: Observable<Storefront>;
  confirmationModal: BsModalRef;
  quoteConfirmation: Quote;
  loading: boolean = false;
  quoteRequestObj: Quote;
  quoteBreadCrumbObj$: Observable<Quote>;
  disableSubmit: boolean = true;
  showCaptcha: boolean = false;
  displayCaptcha: boolean;

  // Tax calculation properties
  taxAddress: TaxAddress;
  taxCalculated: boolean = false;
  taxCalculationEnabled: boolean = false;
  showTaxRecalculationBanner: boolean = false;
  private previousShipToAccountId: string;
  private taxEverCalculated: boolean = false;

  constructor(
    private cartService: CartService,
    private quoteService: QuoteService,
    private modalService: BsModalService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.quoteRequestObj = new Quote();
    this.cart$ = this.cartService.getMyCart();
  }

  updateTaxAddress(account: Account): void {
    // Reset tax state
    this.taxCalculated = false;

    if (!account) {
      this.taxAddress = null;
      this.taxCalculationEnabled = false;
      if (this.taxEverCalculated) {
        this.showTaxRecalculationBanner = true;
      }
      this.cdr.detectChanges();
      return;
    }

    this.taxAddress = {
      Line1: account.ShippingStreet || '',
      Line2: '',
      City: account.ShippingCity || '',
      Region: account.ShippingState || '',
      Country: account.ShippingCountry || '',
      PostalCode: (account.ShippingPostalCode || '').toString()
    };

    this.taxCalculationEnabled = true;
    this.cdr.detectChanges();
  }

  // Handle tax status changes from price summary component
  onTaxStatusChange(status: { calculated: boolean, enabled: boolean, amount: number }): void {
    this.taxCalculated = status.calculated;

    if (status.calculated) {
      this.taxEverCalculated = true;
      if (this.taxAddress) {
        this.showTaxRecalculationBanner = false;
      }
    }
  }

  onUpdate($event: Quote) {
    this.quoteRequestObj = $event;
    this.disableSubmit = isEmpty(this.quoteRequestObj.PrimaryContact && this.quoteRequestObj.ProposalName && get(this.quoteRequestObj, 'PartnerAccount.Id'));

    // Check if ship-to account changed and update tax address
    const newShipToAccountId = get(this.quoteRequestObj, 'ShipToAccount.Id');
    if (this.previousShipToAccountId !== newShipToAccountId) {
      this.updateTaxAddress(this.quoteRequestObj.ShipToAccount);

      if (this.previousShipToAccountId && this.taxEverCalculated && newShipToAccountId) {
        this.showTaxRecalculationBanner = true;
        this.cdr.detectChanges();
      }
    }

    this.previousShipToAccountId = newShipToAccountId;
  }

  onCartTotalsChanged(): void {
    if (get(this.quoteRequestObj, 'ShipToAccount')) {
      this.updateTaxAddress(this.quoteRequestObj.ShipToAccount);

      // Show banner only if tax was ever calculated before
      if (this.taxEverCalculated) {
        this.showTaxRecalculationBanner = true;
      }
    } else {
      this.taxAddress = null;
      // Show banner when no account AND tax was calculated before
      this.showTaxRecalculationBanner = this.taxEverCalculated;
      this.cdr.detectChanges();
    }
  }

  closeTaxRecalculationBanner(): void {
    this.showTaxRecalculationBanner = false;
  }

  loadCaptcha() {
    this.displayCaptcha = true;
  }

  captchaSuccess(cart: Cart) {
    this.showCaptcha = false;
    this.convertCartToQuote(cart);
  }

  quotePlacement(cart: Cart) {
    if (this.displayCaptcha)
      this.showCaptcha = true;
    else {
      this.convertCartToQuote(cart);
    }
  }
  convertCartToQuote(cart: Cart) {
    const quoteAmountGroup = find(get(cart, 'SummaryGroups'), c => get(c, 'LineType') === 'Grand Total');
    set(this.quoteRequestObj, 'GrandTotal.Value', defaultTo(get(quoteAmountGroup, 'NetPrice', 0).toString(), '0'));
    if (this.quoteRequestObj.PrimaryContact) {
      this.loading = true;
      this.quoteService.convertCartToQuote(this.quoteRequestObj).pipe(take(1)).subscribe(res => {
        this.loading = false;
        this.quoteConfirmation = res;
        this.confirmationModal = this.modalService.show(this.confirmationTemplate, { class: 'modal-lg' });
      },
        err => {
          this.loading = false;
        });
    }
  }


}
