import { Component, OnInit, ViewChild, TemplateRef, OnDestroy, ViewEncapsulation, ElementRef, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, BehaviorSubject, Subscription, combineLatest } from 'rxjs';
import { filter, map, take, mergeMap, switchMap } from 'rxjs/operators';
import { get, set, find,  defaultTo, map as _map } from 'lodash';
import { BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { ApiService } from '@congarevenuecloud/core';
import {
  UserService, QuoteService, Quote, Order, OrderService, Note, NoteService, AttachmentService,
  Attachment, ProductInformationService, ItemGroup, EmailService, LineItemService, QuoteLineItemService, Account, AccountService, Contact, ContactService, LineItem, QuoteLineItem
} from '@congarevenuecloud/ecommerce';
import { ExceptionService, LookupOptions, RevalidateCartService } from '@congarevenuecloud/elements';
@Component({
  selector: 'app-quote-details',
  templateUrl: './quote-detail.component.html',
  styleUrls: ['./quote-detail.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class QuoteDetailComponent implements OnInit, OnDestroy {

  quote$: BehaviorSubject<Quote> = new BehaviorSubject<Quote>(null);
  quoteLineItems$: BehaviorSubject<Array<ItemGroup>> = new BehaviorSubject<Array<ItemGroup>>(null);
  attachmentList$: BehaviorSubject<Array<Attachment>> = new BehaviorSubject<Array<Attachment>>(null);
  noteList$: BehaviorSubject<Array<Note>> = new BehaviorSubject<Array<Note>>(null);
  order$: Observable<Order>;
  quote: Quote;

  @ViewChild('attachmentSection') attachmentSection: ElementRef;

  note: Note = new Note();

  newlyGeneratedOrder: Order;

  intimationModal: BsModalRef;

  hasSizeError: boolean;

  file: File;

  uploadFileList: any;

  editLoader = false;

  acceptLoader = false;

  commentsLoader = false;

  attachmentsLoader = false;

  finalizeLoader = false;

  quoteGenerated: boolean = false;

  notesSubscription: Subscription;

  attachemntSubscription: Subscription;

  quoteSubscription: Subscription;

  quoteStatusSteps = [
    'Draft',
    'Approved',
    'Generated',
    'Presented',
    'Accepted'
  ];

  quoteStatusMap = {
    'Draft': 'Draft',
    'Approval Required': 'Approval Required',
    'In Review': 'In Review',
    'Approved': 'Approved',
    'Generated': 'Generated',
    'Presented': 'Presented',
    'Accepted': 'Accepted',
    'Denied': 'Denied'
  }

  @ViewChild('intimationTemplate') intimationTemplate: TemplateRef<any>;

  lookupOptions: LookupOptions = {
    primaryTextField: 'Name',
    secondaryTextField: 'Email',
    fieldList: ['Id', 'Name', 'Email']
  };

  constructor(private activatedRoute: ActivatedRoute,
    private quoteService: QuoteService,
    private modalService: BsModalService,
    private orderService: OrderService,
    private accountService: AccountService,
    private contactService: ContactService,
    private ngZone: NgZone,
    private router: Router) { }

  ngOnInit() {
    this.getQuote();
  }

  getQuote() {
    this.ngOnDestroy();
    if (this.quoteSubscription) this.quoteSubscription.unsubscribe();
    this.quoteSubscription = this.activatedRoute.params
      .pipe(
        filter(params => get(params, 'id') != null),
        map(params => get(params, 'id')),
        mergeMap(quoteId => this.quoteService.getQuoteById(quoteId)),
        switchMap((quote: Quote) => combineLatest([
          of(quote),
          // Using query instead of get(), as get is not returning list of accounts as expected.
          this.accountService.getCurrentAccount(),
          get(quote.BillToAccount, 'Id') ? this.accountService.getAccount(get(quote.BillToAccount, 'Id')) : of(null),
          get(quote.ShipToAccount, 'Id') ? this.accountService.getAccount(get(quote.ShipToAccount, 'Id')) : of(null),
          get(quote.PrimaryContact, 'Id') ? this.contactService.fetch(get(quote.PrimaryContact, 'Id')) : of(null)
        ]),
        ),
        map(([quote, accounts, billToAccount, shipToAccount, primaryContact]) => {
          quote.Account = defaultTo(find([accounts], acc => get(acc, 'Id') === get(quote.Account, 'Id')), quote.Account);
          quote.BillToAccount = billToAccount;
          quote.ShipToAccount = shipToAccount;
          quote.PrimaryContact = defaultTo(primaryContact, quote.PrimaryContact) as Contact;;
          set(quote, 'Items', LineItemService.groupItems(get(quote, 'Items')));
          this.order$ = this.orderService.getOrderByQuote(get(quote, 'Id'));
          this.quote = quote;
          return this.quote;
        }
        )).subscribe();

  }

  refreshQuote(fieldValue, quote, fieldName) {
    set(quote, fieldName, fieldValue);
    const payload = quote.strip(['Owner', 'Items', 'TotalCount']);
    this.quoteService.updateQuote(quote.Id, payload).subscribe(() => {
      this.getQuote();
    })
  }



  acceptQuote(quoteId: string, primaryContactId: string) {
    this.acceptLoader = true;
    this.quoteService.acceptQuote(quoteId).pipe(take(1)).subscribe(
      res => {
        if (res) {
          this.acceptLoader = false;
          const ngbModalOptions: ModalOptions = {
            backdrop: 'static',
            keyboard: false
          };
          this.ngZone.run(() => {
            this.intimationModal = this.modalService.show(this.intimationTemplate, ngbModalOptions);
          });
        }
      },
      err => {
        this.acceptLoader = false;
      }
    );
  }

  closeModal() {
    this.intimationModal.hide();
    this.getQuote();
  }

  
  finalizeQuote(quoteId: string) {
    this.finalizeLoader = true;
    this.quoteService.finalizeQuote(quoteId).pipe(take(1)).subscribe(
      res => {
        if (res) {
          this.finalizeLoader = false;
          this.getQuote();
        }
      },
      err => {
        this.finalizeLoader = false;
      }
    );
  }
  
  onGenerateQuote() {
    if (this.attachmentSection) this.attachmentSection.nativeElement.scrollIntoView({ behavior: 'smooth' });
    this.getQuote();
    this.quoteGenerated = true;
  }

  ngOnDestroy() {
    if (this.notesSubscription)
      this.notesSubscription.unsubscribe();
    if (this.attachemntSubscription)
      this.attachemntSubscription.unsubscribe();
    if (this.quoteSubscription)
      this.quoteSubscription.unsubscribe();
  }
}

