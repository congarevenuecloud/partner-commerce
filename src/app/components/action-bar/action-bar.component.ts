import { Component, OnInit, ChangeDetectionStrategy, ViewChild, Input } from '@angular/core';
import { Observable, of, combineLatest } from 'rxjs';
import { switchMap, take, map } from 'rxjs/operators';
import { get } from 'lodash';
import { FilterOperator } from '@congarevenuecloud/core';
import { CartService, Cart, OrderService, AccountService } from '@congarevenuecloud/ecommerce';
import { ExceptionService, OutputFieldComponent, QuickAddField } from '@congarevenuecloud/elements';
@Component({
    selector: 'app-action-bar',
    templateUrl: './action-bar.component.html',
    styleUrls: ['./action-bar.component.scss'],
    changeDetection: ChangeDetectionStrategy.Default,
    standalone: false
})
export class ActionBarComponent implements OnInit {

  @Input() isDsrMode: boolean = false;

  cart$: Observable<Cart>;
  loading: boolean = false;
  fields: string[];
  quoteFields: Array<string | QuickAddField>;
  orderFields: Array<string | QuickAddField>;

  @ViewChild('accountField', { static: false }) accountField: OutputFieldComponent;

  constructor(private cartService: CartService, private exceptionService: ExceptionService, private orderService: OrderService, private accountService: AccountService) { }

  ngOnInit() {
    this.cart$ = this.cartService.getMyCart();
    this.fields = ['AdjustmentType', 'AdjustmentAmount', 'StartDate', 'EndDate'];
    this.accountService.getCurrentAccount().pipe(take(1)).subscribe(account => {
      // Scope the Primary Contact lookup to the current account (parity with checkout).
      const primaryContact: QuickAddField = { field: 'PrimaryContact', required: true, lookupOptions: { primaryTextField: 'Name', filters: [{ field: 'Account.Id', value: get(account, 'Id'), filterOperator: FilterOperator.EQUAL }] } };
      this.quoteFields = [
        'Description', 'BillToAccount', 'configurationSyncDate', 'Accept', 'PriceList', 'SourceChannel',
        { field: 'PartnerAccount', required: true, lookupOptions: { primaryTextField: 'Name', fieldList: ['Id', 'Name'], filters: [{ field: 'IsPartner', value: true, filterOperator: FilterOperator.EQUAL }] } },
        primaryContact
      ];
      this.orderFields = ['Description', 'BillToAccount', 'configurationSyncDate', 'Accept', 'PriceList', 'SourceChannel', primaryContact];
    });
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
