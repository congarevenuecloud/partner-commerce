import { Component, OnInit } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map as rmap, switchMap, take, catchError } from 'rxjs/operators';
import moment from 'moment';
import { get, sumBy, map as _map } from 'lodash';
import { Operator, ApiService, FilterOperator } from '@congarevenuecloud/core';
import { Quote, QuoteService, LocalCurrencyPipe, AccountService, FieldFilter } from '@congarevenuecloud/ecommerce';
import { TableOptions, CustomFilterView, FilterOptions, ExceptionService } from '@congarevenuecloud/elements';

@Component({
  selector: 'app-quote-list',
  templateUrl: './quote-list.component.html',
  styleUrls: ['./quote-list.component.scss']
})
export class QuoteListComponent implements OnInit {
  type = Quote;

  totalAmount$: Observable<number>;
  totalRecords$: Observable<number>;
  view$: Observable<QuoteListView>;

  filterList$: BehaviorSubject<Array<FieldFilter>> = new BehaviorSubject<Array<FieldFilter>>([]);

  filterOptions: FilterOptions = {
    visibleFields: [
      'ApprovalStage',
      'CreatedDate',
      'RFPResponseDueDate',
      'GrandTotal',
      'BillToAccount',
      'ShipToAccount',
    ],
    visibleOperators: [
      Operator.EQUAL,
      Operator.NOT_EQUAL,
      Operator.IN,
      Operator.NOT_IN,
      Operator.LESS_THAN,
      Operator.LESS_EQUAL,
      Operator.GREATER_THAN,
      Operator.GREATER_EQUAL,
      Operator.LIKE
    ]
  };
  customfilter: Array<CustomFilterView> = [
    {
      label: 'Pending Duration',
      mapApiField: 'RFPResponseDueDate',
      type: 'double',
      minVal: -99,
      execute: (val: number, condition: any): Date => {
        return this.handlePendingDuration(val, condition);
      }
    }
  ];

  constructor(private quoteService: QuoteService, private currencyPipe: LocalCurrencyPipe, private accountService: AccountService, private apiService: ApiService, private exceptionService: ExceptionService) { }

  ngOnInit() {
    this.loadView();
  }

  loadView() {
    let tableOptions = {} as QuoteListView;
    this.view$ = this.accountService.getCurrentAccount()
      .pipe(
        switchMap(() => {
          tableOptions = {
            tableOptions: {
              columns: [
                {
                  prop: 'Name',
                  label: 'CUSTOM_LABELS.PROPOSAL_NAME'
                },
                {
                  prop: 'ApprovalStage'
                },
                {
                  prop: 'RFPResponseDueDate'
                },
                {
                  prop: 'PriceList.Name',
                  label: 'CUSTOM_LABELS.PRICELIST'
                },
                {
                  prop: 'GrandTotal',
                  label: 'CUSTOM_LABELS.TOTAL_AMOUNT',
                  value: (record) => {
                    return this.currencyPipe.transform(get(get(record, 'GrandTotal'), 'DisplayValue'));
                  }
                },
                {
                  prop: 'Account.Name',
                  label: 'CUSTOM_LABELS.ACCOUNT'
                },
                {
                  prop: 'ModifiedDate',
                  label: 'CUSTOM_LABELS.LAST_MODIFIED_DATE'
                }
              ],
              filters: this.filterList$.value.concat(this.getFilters()),
              routingLabel: 'proposals'
            }
          }
          this.fetchQuoteTotals();
          return of(tableOptions);
        })
      );
  }

  handleFilterListChange(event: any) {
    this.filterList$.next(event);
    this.loadView();
  }

  handlePendingDuration(val: number, condition: any): Date {
    const date = moment(new Date()).format('YYYY-MM-DD');
    let momentdate;
    if (condition.filterOperator === 'GreaterThan')
      momentdate = moment(date).add(val, 'd').format('YYYY-MM-DD');
    else if (condition.filterOperator === 'LessThan')
      momentdate = moment(date).subtract(val, 'd').format('YYYY-MM-DD');
    return momentdate;
  }

  getFilters(): Array<FieldFilter> {
    return [{
      field: 'Account.Id',
      value: localStorage.getItem('account'),
      filterOperator: FilterOperator.EQUAL
    }] as Array<FieldFilter>;
  }

  fetchQuoteTotals() {
    this.quoteService.getMyQuotes(null, this.filterList$.value.concat(this.getFilters()), null, null, null, null, null, false)
      .pipe(
        rmap((quoteList: Array<Quote>) => {
          this.totalRecords$ = quoteList ? of(get(quoteList, 'length')) : of(0);
          this.totalAmount$ = of(sumBy(quoteList, (quote) => get(quote, 'GrandTotal.Value')));
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
}

interface QuoteListView {
  tableOptions: TableOptions;
}