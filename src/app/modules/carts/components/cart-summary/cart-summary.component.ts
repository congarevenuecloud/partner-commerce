import { Component, OnInit, ViewChild, TemplateRef, Input, OnChanges } from '@angular/core';
import { Cart, StorefrontService, Storefront, ConstraintRuleService, SummaryGroup } from '@congarevenuecloud/ecommerce';
import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { Observable, of } from 'rxjs';
import { find, get, sum } from 'lodash';

@Component({
  selector: 'app-cart-summary',
  templateUrl: './cart-summary.component.html',
  styleUrls: ['./cart-summary.component.scss']
})

export class CartSummaryComponent implements OnInit, OnChanges {
  @Input() cart: Cart;
  @ViewChild('discardChangesTemplate') discardChangesTemplate: TemplateRef<any>;
  loading: boolean = false;
  discardChangesModal: BsModalRef;
  _cart: Cart;

  isLoggedIn$: Observable<boolean>;
  hasErrors: boolean = true;

  totalPromotions: number = 0;
  storefront$: Observable<Storefront>;
  @ViewChild('confirmationTemplate') confirmationTemplate: TemplateRef<any>;

  showTaxPopUp: boolean = false;
  totalEstimatedTax: number = 0;
  taxPopHoverModal: BsModalRef;
  cartTotal:SummaryGroup;
  cartSubTotal: SummaryGroup;

  constructor(private modalService: BsModalService, private crService: ConstraintRuleService,
    private storefrontService: StorefrontService) {
  }

  ngOnInit() {
    this.isLoggedIn$ = of(true);
    this.crService.hasPendingErrors().subscribe(val => this.hasErrors = val);
    this.storefront$ = this.storefrontService.getStorefront();
  }

  ngOnChanges() {
    this.totalPromotions = ((this.cart && get(this.cart, 'LineItems.length') > 0)) ? sum(this.cart.LineItems.map(res => res.IncentiveAdjustmentAmount)) : 0;
    this.cartTotal = find(this.cart.SummaryGroups, grp => grp.LineType === 'Grand Total'); 
    this.cartSubTotal = find(this.cart.SummaryGroups, grp => grp.LineType === 'Subtotal');
  }

  openDiscardChageModals() {
    this.discardChangesModal = this.modalService.show(this.discardChangesTemplate);
  }

}
