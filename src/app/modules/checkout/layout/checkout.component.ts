import { Component, OnInit, ViewChild, ElementRef, TemplateRef, OnDestroy, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { TabsetComponent } from 'ngx-bootstrap/tabs';
import { BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { TranslateService } from '@ngx-translate/core';
import { get, uniqueId, set, cloneDeep, isNil, isEmpty } from 'lodash';
import { ConfigurationService } from '@congarevenuecloud/core';
import {
  Account, Cart, CartService, Order, OrderService, Contact, ContactService,
  UserService, AccountService, AccountInfo, EmailService, EmailTemplate
} from '@congarevenuecloud/ecommerce';
import { ExceptionService, PriceSummaryComponent, LookupOptions } from '@congarevenuecloud/elements';
@Component({
  selector: 'app-cart',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit, OnDestroy {
  @ViewChild('addressTabs') addressTabs: any;
  @ViewChild('addressInfo') addressInfo: ElementRef;
  @ViewChild('staticTabs') staticTabs: TabsetComponent;
  @ViewChild('confirmationTemplate') confirmationTemplate: TemplateRef<any>;
  @ViewChild('priceSummary') priceSummary: PriceSummaryComponent;
  primaryContact: Contact;
  order: Order;
  orderConfirmation: Order;
  loading: boolean = false;
  uniqueId: string;
  confirmationModal: BsModalRef;
  errMessages: any = {
    requiredFirstName: '',
    requiredLastName: '',
    requiredEmail: '',
    requiredPrimaryContact: '',
    requiredShipToAcc: '',
    requiredBillToAcc: '',
    requiredOrderTitle: ''
  };
  cart: Cart;
  isLoggedIn: boolean;
  shipToAccount$: Observable<Account>;
  billToAccount$: Observable<Account>;
  primaryContact$: Observable<any>;
  pricingSummaryType: 'checkout' | 'paymentForOrder' | '' = 'checkout';
  breadcrumbs;
  lookupOptions: LookupOptions = {
    primaryTextField: 'Name',
    secondaryTextField: 'Email',
    fieldList: ['Id', 'Name', 'Email']
  };
  disableSubmit: boolean = false;
  showCaptcha: boolean = false;
  displayCaptcha: boolean;

  private subscriptions: Subscription[] = [];

  constructor(private cartService: CartService,
    public configurationService: ConfigurationService,
    private orderService: OrderService,
    private modalService: BsModalService,
    public contactService: ContactService,
    private translate: TranslateService,
    private userService: UserService,
    private accountService: AccountService,
    private router: Router,
    private ngZone: NgZone,
    private exceptionService: ExceptionService,
    private emailService: EmailService) {
    this.uniqueId = uniqueId();
  }
  ngOnInit() {
    this.subscriptions.push(this.userService.isLoggedIn().subscribe(isLoggedIn => this.isLoggedIn = isLoggedIn));
    this.subscriptions.push(this.accountService.getCurrentAccount().subscribe(() => {
      this.lookupOptions.expressionOperator = 'AND';
      this.lookupOptions.filters = null;
      this.lookupOptions.sortOrder = null;
      this.lookupOptions.page = 10;
    }));
    this.order = new Order();
    this.subscriptions.push(this.cartService.getMyCart().subscribe(cart => {
      this.cart = cart;
      // Setting default values on order record.
      this.order.Name = 'New Order'
      this.order.SoldToAccount = get(cart, 'Account');
      this.order.BillToAccount = get(cart, 'Account');
      this.order.ShipToAccount = get(cart, 'Account');
      this.order.PriceList = get(cart, 'PriceList');
    }));
    this.subscriptions.push(this.contactService.getMyContact()
      .pipe(take(1)).subscribe(c => {
        this.primaryContact = this.order.PrimaryContact = get(c, 'Contact');
        this.order.PrimaryContact = this.primaryContact
      }));
    this.subscriptions.push(this.translate.stream(['PRIMARY_CONTACT', 'AOBJECTS']).subscribe((val: string) => {
      this.errMessages.requiredFirstName = val['PRIMARY_CONTACT']['INVALID_FIRSTNAME'];
      this.errMessages.requiredLastName = val['PRIMARY_CONTACT']['INVALID_LASTNAME'];
      this.errMessages.requiredEmail = val['PRIMARY_CONTACT']['INVALID_EMAIL'];
      this.errMessages.requiredPrimaryContact = val['PRIMARY_CONTACT']['INVALID_PRIMARY_CONTACT'];
      this.errMessages.requiredBillToAcc = val['PRIMARY_CONTACT']['INVALID_BILL_TO_ACC'];
      this.errMessages.requiredShipToAcc = val['PRIMARY_CONTACT']['INVALID_SHIP_TO_ACC'];
      this.errMessages.requiredOrderTitle = val['PRIMARY_CONTACT']['INVALID_ORDER_TITLE'];
      this.breadcrumbs = [
        {
          label: val['AOBJECTS']['CART'],
          route: [`/carts/active`]
        }
      ];
    }));
    this.onBillToChange();
    this.onShipToChange();
    this.isButtonDisabled();
  }

  isButtonDisabled() {
    this.disableSubmit = isNil(this.order.PrimaryContact) || !this.order.Name || isNil(this.order.BillToAccount) || isNil(this.order.ShipToAccount);
  }

  submitOrder() {
    this.convertCartToOrder(get(this, 'order'), get(this, 'order.PrimaryContact'));
  }
  onBillToChange() {
    if (get(this.order.BillToAccount, 'Id'))
      this.billToAccount$ = this.accountService.getAccount(get(this.order.BillToAccount, 'Id'));
    this.isButtonDisabled()
  }

  onShipToChange() {
    if (get(this.order.ShipToAccount, 'Id'))
      this.shipToAccount$ = this.accountService.getAccount(get(this.order.ShipToAccount, 'Id'));
    this.isButtonDisabled()
  }

  onPrimaryContactChange() {
    this.subscriptions.push(
      this.contactService.fetch(get(this.order.PrimaryContact, 'Id')).subscribe(c => {
        this.order.PrimaryContact.Id = get(c, 'Id');
        set(this.order, 'PrimaryContact', c);
      })
    );
    this.isButtonDisabled()
  }

  convertCartToOrder(order: Order, primaryContact: Contact, cart?: Cart, selectedAccount?: AccountInfo, acceptOrder?: boolean) {
    this.loading = true;
    this.orderService.convertCartToOrder(order, primaryContact).pipe(
      take(1)
    ).subscribe(orderResponse => {
      this.loading = false;
      this.orderConfirmation = orderResponse;
      this.updateOrder();
    },
      err => {
        this.exceptionService.showError(err);
        this.loading = false;
      });
  }

  updateOrder()
  {
    const orderPayload = get(this,'order').strip(['Name','BillToAccount','ShipToAccount','SoldToAccount','PrimaryContact','Location','Owner','PriceList']);
    this.orderService.updateOrder(get(this.orderConfirmation,"Id"),orderPayload as Order).pipe(
      take(1)
    ).subscribe(res => {
      this.onOrderConfirmed();
    },
      err => {
        this.orderConfirmation.set("retryUpdate",true)
        this.orderConfirmation.set("updatePayload",orderPayload);
        this.orderConfirmation = cloneDeep(this.orderConfirmation)
        this.orderService.publish(this.orderConfirmation);
      })
  }
  redirectOrderPage() {
    this.ngZone.run(() => {
      this.router.navigate(['/orders', this.orderConfirmation.Id]);
    });
  }
  onOrderConfirmed() {
    const ngbModalOptions: ModalOptions = {
      backdrop: 'static',
      keyboard: false,
      class: 'modal-lg'
    };
    this.confirmationModal = this.modalService.show(this.confirmationTemplate, ngbModalOptions);
    if (get(this.orderConfirmation, 'Id')) {
      this.emailService.getEmailTemplateByName('DC Order Notification Template').pipe(
        take(1),
        switchMap((templateInfo: EmailTemplate) => templateInfo ? this.emailService.sendEmailNotificationWithTemplate(get(templateInfo, 'Id'), this.orderConfirmation, get(this.orderConfirmation.PrimaryContact, 'Id')) : of(null))
      ).subscribe();
    }
  }

  loadCaptcha() {
    this.displayCaptcha = true;
  }

  captchaSuccess(cart: Cart) {
    this.showCaptcha = false;
    this.submitOrder();
  }

  orderPlacement() {
    if (this.displayCaptcha)
      this.showCaptcha = true;
    else {
      this.submitOrder();
    }
  }

  closeModal() {
    this.confirmationModal.hide();
    this.redirectOrderPage();
  }
  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }
}