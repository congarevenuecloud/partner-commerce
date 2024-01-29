import { Component, OnInit, ViewChild, TemplateRef, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { TranslateService } from '@ngx-translate/core';
import { get, set, find, defaultTo, isEmpty, cloneDeep } from 'lodash';
import { Quote, QuoteService, StorefrontService, Storefront, Cart, CartService } from '@congarevenuecloud/ecommerce';

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
  // TODO: Update the variable names to avoid confusions.
  showCaptcha: boolean=false;
  displayCaptcha: boolean;

  constructor(private cartService: CartService, private quoteService: QuoteService, private modalService: BsModalService, private translate: TranslateService, private storefrontService: StorefrontService, private ngZone: NgZone) { }

  ngOnInit() {
    this.quoteRequestObj = new Quote();
    this.cart$ = this.cartService.getMyCart();
  }

  onUpdate($event: Quote) {
    this.quoteRequestObj = $event;
    this.disableSubmit = isEmpty(this.quoteRequestObj.PrimaryContact && this.quoteRequestObj.ProposalName);
  }

  loadCaptcha() {
       this.displayCaptcha = true;
  }

  captchaSuccess(cart: Cart){
    this.showCaptcha= false;
    this.convertCartToQuote(cart);
  }

  quotePlacement(cart: Cart){
  if(this.displayCaptcha)
     this.showCaptcha=true;
  else{
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
        this.updateQuote();
        this.confirmationModal = this.modalService.show(this.confirmationTemplate, { class: 'modal-lg' });
      },
        err => {
          this.loading = false;
        });
    }
  }

  updateQuote() {
    const quotePayload = this.quoteRequestObj.strip(['GrandTotal.Value','Owner','PriceList']);
    this.quoteService.updateQuote(get(this.quoteConfirmation,"Id"),quotePayload as Quote).pipe(take(1)).
    subscribe(data => {
    },err => {
      this.quoteConfirmation.set("retryUpdate",true);
      this.quoteConfirmation.set("updatePayload",quotePayload);
        this.quoteConfirmation = cloneDeep(this.quoteConfirmation)
        this.quoteService.publish(this.quoteConfirmation);
    })
  }
}
