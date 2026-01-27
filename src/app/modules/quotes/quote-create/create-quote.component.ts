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
  showCaptcha: boolean=false;
  displayCaptcha: boolean;

  // Tax calculation properties
  taxAddress: TaxAddress;
  taxCalculated: boolean = false;
  taxCalculationEnabled: boolean = false;
  private previousShipToAccountId: string;

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
    if (!account) return;

    const postalCode = account.ShippingPostalCode || account.BillingPostalCode;

    if (postalCode) {
      // Reset tax calculation when address changes
      this.taxCalculated = false;

      // Create a new object reference to trigger ngOnChanges in price-summary component
      this.taxAddress = {
        Line1: account.ShippingStreet || account.BillingStreet || '',
        Line2: '',
        City: account.ShippingCity || account.BillingCity || '',
        Region: account.ShippingState || account.BillingState || '',
        Country: account.ShippingCountry || account.BillingCountry || '',
        PostalCode: postalCode.toString()
      };

      // Trigger change detection to ensure updates propagate
      this.cdr.detectChanges();
    }
  }

  // Handle tax status changes from price summary component
  onTaxStatusChange(status: { calculated: boolean, enabled: boolean, amount: number }): void {
    this.taxCalculated = status.calculated;
    this.taxCalculationEnabled = status.enabled;
  }

  // Check if tax calculation is blocking quote creation
  isTaxCalculationBlocking(): boolean {
    return this.taxCalculationEnabled && !this.taxCalculated;
  }

  onUpdate($event: Quote) {
    this.quoteRequestObj = $event;
    this.disableSubmit = isEmpty(this.quoteRequestObj.PrimaryContact && this.quoteRequestObj.ProposalName);

    // Check if ship-to account changed and update tax address
    const newShipToAccountId = get(this.quoteRequestObj, 'ShipToAccount.Id');
    if (this.previousShipToAccountId !== newShipToAccountId && get(this.quoteRequestObj, 'ShipToAccount')) {
      this.updateTaxAddress(this.quoteRequestObj.ShipToAccount);
    }

    this.previousShipToAccountId = newShipToAccountId;
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
