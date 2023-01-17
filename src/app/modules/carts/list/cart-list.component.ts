import { Component, OnInit, TemplateRef } from '@angular/core';
import { BsModalService } from 'ngx-bootstrap/modal';
import { TranslateService } from '@ngx-translate/core';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { Observable, of } from 'rxjs';
import { map, mergeMap, take } from 'rxjs/operators';
import { ClassType } from 'class-transformer/ClassTransformer';
import { first } from 'lodash';
import { AObject, FilterOperator } from '@congarevenuecloud/core';
import { CartService, Cart, Price, PriceService, CartResult, FieldFilter } from '@congarevenuecloud/ecommerce';
import { TableOptions, TableAction } from '@congarevenuecloud/elements';

@Component({
  selector: 'app-cart-list',
  templateUrl: './cart-list.component.html',
  styleUrls: ['./cart-list.component.scss']
})
export class CartListComponent implements OnInit {
  type = Cart;

  modalRef: BsModalRef;
  message: string;
  loading: boolean = false;
  cart: Cart;
  view$: Observable<CartListView>;
  cartAggregate$: Observable<any>;

  constructor(private cartService: CartService, public priceService: PriceService,
    private modalService: BsModalService, private translateService: TranslateService) { }

  ngOnInit() {
    this.loadView();
  }

  loadView() {
    this.getCartAggregate();
    let tableOptions = {} as CartListView;
    this.view$ = this.cartService.getMyCart()
      .pipe(
        map(() => {
          tableOptions = {
            tableOptions: {
              columns: [
                {
                  prop: 'Name'
                },
                {
                  prop: 'CreatedDate'
                },
                {
                  prop: 'NumberOfItems'
                },
                {
                  prop: 'IsActive',
                  label: 'CUSTOM_LABELS.IS_ACTIVE',
                  sortable: false,
                  value: (record: Cart) => CartService.getCurrentCartId() === record.Id ? of('Yes') : of('No')
                },
                {
                  prop: 'TotalAmount',
                  label: 'CUSTOM_LABELS.TOTAL_AMOUNT',
                  sortable: false,
                  value: (record: Cart) => this.getCartTotal(record)
                },
                {
                  prop: 'Status'
                }
              ],
              lookups: ['SummaryGroups'],
              actions: [
                {
                  enabled: true,
                  icon: 'fa-check',
                  massAction: false,
                  label: 'Set Active',
                  theme: 'primary',
                  validate: (record: Cart) => this.canActivate(record),
                  action: (recordList: Array<Cart>) => this.cartService.setCartActive(first(recordList), true),
                  disableReload: true
                } as TableAction,
                {
                  enabled: true,
                  icon: 'fa-trash',
                  massAction: true,
                  label: 'Delete',
                  theme: 'danger',
                  validate: (record: Cart) => this.canDelete(record),
                  action: (recordList: Array<Cart>) => this.cartService.deleteCart(recordList).pipe(map(res => this.getCartAggregate())),
                  disableReload: true
                } as TableAction
              ],
              highlightRow: (record: Cart) => of(CartService.getCurrentCartId() === record.Id),
              filters: this.getFilters()
            },
            type: Cart
          }
          this.getCartAggregate();
          return tableOptions;
        })
      );
  }

  private getCartAggregate(): Observable<CartResult> {
    return this.cartAggregate$ = this.cartService.getCartList(this.getFilters()).pipe(map(res => res));
  }

  newCart(template: TemplateRef<any>) {
    this.cart = new Cart();
    this.message = null;
    this.modalRef = this.modalService.show(template);
  }

  createCart() {
    this.loading = true;
    this.cartService.createNewCart(this.cart).pipe(take(1)).subscribe(
      res => {
        this.loading = false;
        this.modalRef.hide();
        this.loadView();
      },
      err => {
        this.loading = false;
        this.translateService.stream('MY_ACCOUNT.CART_LIST.CART_CREATION_FAILED').subscribe((val: string) => {
          this.message = val;
        });
      }
    );
  }

  getCartTotal(currentCart: Cart) {
    return this.priceService.getCartPrice(currentCart).pipe(mergeMap((price: Price) => price.netPrice$));
  }

  canDelete(cartToDelete: Cart) {
    return (cartToDelete.Status !== 'Finalized');
  }

  canActivate(cartToActivate: Cart) {
    return (CartService.getCurrentCartId() !== cartToActivate.Id && cartToActivate.Status !== 'Finalized');
  }

  getFilters(): Array<FieldFilter> {
    return [{
      field: 'Account.Id',
      value: localStorage.getItem('account'),
      filterOperator: FilterOperator.EQUAL
    },
    {
      field: 'Status',
      value: 'Saved',
      filterOperator: FilterOperator.NOT_EQUAL
    }] as Array<FieldFilter>;
  }
}

interface CartListView {
  tableOptions: TableOptions;
  type: ClassType<AObject>;
}
