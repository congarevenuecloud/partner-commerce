import { Component, OnInit, ChangeDetectionStrategy, ViewChild, Input } from '@angular/core';
import { Observable, of, combineLatest } from 'rxjs';
import { switchMap, take, map } from 'rxjs/operators';
import { get } from 'lodash';
import { FilterOperator } from '@congarevenuecloud/core';
import { CartService, Cart, OrderService } from '@congarevenuecloud/ecommerce';
import { ExceptionService, OutputFieldComponent, QuickAddField } from '@congarevenuecloud/elements';
@Component({
  selector: 'app-action-bar',
  templateUrl: './action-bar.component.html',
  styleUrls: ['./action-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class ActionBarComponent implements OnInit {

  @Input() isDsrMode: boolean = false;

  cart$: Observable<Cart>;
  loading: boolean = false;
  fields: string[];
  quoteFields: Array<string | QuickAddField>;
  orderFields: string[];

  @ViewChild('accountField', { static: false }) accountField: OutputFieldComponent;

  constructor(private cartService: CartService, private exceptionService: ExceptionService, private orderService: OrderService) { }

  ngOnInit() {
    this.cart$ = this.cartService.getMyCart();
    this.quoteFields = [
      'Description', 'BillToAccount', 'configurationSyncDate', 'Accept', 'PriceList', 'SourceChannel',
      { field: 'PartnerAccount', required: true, lookupOptions: { primaryTextField: 'Name', fieldList: ['Id', 'Name'], filters: [{ field: 'IsPartner', value: true, filterOperator: FilterOperator.EQUAL }] } }
    ];
    this.orderFields = ['Description', 'BillToAccount', 'configurationSyncDate', 'Accept', 'PriceList', 'SourceChannel'];
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
