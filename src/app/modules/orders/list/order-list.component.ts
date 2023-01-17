import { Component, OnInit, OnDestroy } from '@angular/core';
import { of, Observable, Subscription, BehaviorSubject } from 'rxjs';
import { switchMap, take, map as rmap, catchError } from 'rxjs/operators';
import { get, sumBy } from 'lodash';
import { Operator, ApiService, FilterOperator } from '@congarevenuecloud/core';
import { OrderService, Order, AccountService, FieldFilter } from '@congarevenuecloud/ecommerce';
import { TableOptions, FilterOptions, ExceptionService } from '@congarevenuecloud/elements';
@Component({
  selector: 'app-order-list',
  templateUrl: './order-list.component.html',
  styleUrls: ['./order-list.component.scss']
})
export class OrderListComponent implements OnInit, OnDestroy {
  type = Order;

  totalRecords$: Observable<number>;
  totalAmount$: Observable<number>;
  subscription: Subscription;
  view$: Observable<OrderListView>;
  filterList$: BehaviorSubject<Array<any>> = new BehaviorSubject<Array<any>>([]);

  filterOptions: FilterOptions = {
    visibleFields: [
      'BillToAccount',
      'Status',
      'OrderAmount',
      'CreatedDate'
    ],
    visibleOperators: [
      Operator.EQUAL,
      Operator.LESS_THAN,
      Operator.GREATER_THAN,
      Operator.GREATER_EQUAL,
      Operator.LESS_EQUAL,
      Operator.IN
    ]
  };

  constructor(private orderService: OrderService, private accountService: AccountService, private apiService: ApiService, private exceptionService: ExceptionService) { }

  ngOnInit() {
    this.loadView();
  }

  loadView() {
    let tableOptions = {} as OrderListView;
    this.view$ = this.accountService.getCurrentAccount()
      .pipe(
        switchMap(() => {
          tableOptions = {
            tableOptions: {
              columns: [
                {
                  prop: 'Name',
                  label: 'CUSTOM_LABELS.ORDER_NAME'
                },
                {
                  prop: 'Status'
                },
                {
                  prop: 'PriceList.Name',
                  label: 'CUSTOM_LABELS.PRICELIST'
                },
                {
                  prop: 'BillToAccount.Name',
                  label: 'CUSTOM_LABELS.BILL_TO'
                },
                {
                  prop: 'ShipToAccount.Name',
                  label: 'CUSTOM_LABELS.SHIP_TO'
                },
                {
                  prop: 'OrderAmount'
                },
                {
                  prop: 'CreatedDate'
                },
                {
                  prop: 'ActivatedDate'
                }
              ],
              fields: [
                'Description',
                'Status',
                'PriceList.Name',
                'BillToAccount.Name',
                'ShipToAccount.Name',
                'OrderAmount',
                'CreatedDate',
                'ActivatedDate'
              ],
              filters: this.filterList$.value.concat(this.getFilters()),
              routingLabel: 'orders'
            }
          }
          this.fetchOrderTotals();
          return of(tableOptions);
        }));
  }

  handleFilterListChange(event: any) {
    this.filterList$.next(event);
    this.loadView();
  }

  getFilters(): Array<FieldFilter> {
    return [{
      field: 'SoldToAccount.Id',
      value: localStorage.getItem('account'),
      filterOperator: FilterOperator.EQUAL
    }] as Array<FieldFilter>;
  }

  fetchOrderTotals() {
    this.orderService.getMyOrders(null, null, this.filterList$.value.concat(this.getFilters()), null, null, null, null, null, false)
      .pipe(
        rmap((orderList: Array<Order>) => {
          this.totalRecords$ = orderList ? of(get(orderList, 'length')) : of(0);
          this.totalAmount$ = of(sumBy(orderList, order => get(order, 'OrderAmount.DisplayValue')));
        }),
        take(1),
        catchError(error => {
          this.totalRecords$ = of(0);
          this.totalAmount$ = of(0);
          this.exceptionService.showError(error, 'ERROR.INVALID_REQUEST_ERROR_TOASTR_TITLE');
          return of(error);
        })
      ).subscribe();
  }

  ngOnDestroy() {
    if (this.subscription)
      this.subscription.unsubscribe();
  }
}

interface OrderListView {
  tableOptions: TableOptions;
}