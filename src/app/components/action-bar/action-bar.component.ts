import { Component, OnInit, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { Observable, of, combineLatest } from 'rxjs';
import { switchMap, take, map } from 'rxjs/operators';
import { get } from 'lodash';
import { CartService, Cart, OrderService } from '@congarevenuecloud/ecommerce';
import { ExceptionService, OutputFieldComponent } from '@congarevenuecloud/elements';
@Component({
  selector: 'app-action-bar',
  templateUrl: './action-bar.component.html',
  styleUrls: ['./action-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class ActionBarComponent implements OnInit {

  cart$: Observable<Cart>;
  loading: boolean = false;
  fields: string[];
  businessObjectFields: string[];

  @ViewChild('accountField', { static: false }) accountField: OutputFieldComponent;

  constructor(private cartService: CartService, private exceptionService: ExceptionService, private orderService: OrderService) { }

  ngOnInit() {
    this.cart$ = this.cartService.getMyCart();
    this.businessObjectFields = ['Description', 'BillToAccount', 'Amount', 'ABOType', 'DiscountPercent', 'configurationSyncDate', 'Accept', 'PriceList', 'SourceChannel'];
    this.fields = ['AdjustmentType', 'AdjustmentAmount', 'StartDate', 'EndDate'];
  }

  createNewCart() {
    this.loading = true;
    this.cartService.createNewCart().pipe(take(1)).subscribe(cart => {
      this.loading = false;
      this.exceptionService.showSuccess('ACTION_BAR.CART_CREATION_TOASTR_MESSAGE');
    },
      error => {
        this.loading = false;
        this.exceptionService.showError(error);
      });
  }

}
