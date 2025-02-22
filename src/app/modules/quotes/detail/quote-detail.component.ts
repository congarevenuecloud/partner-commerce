import { Component, OnInit, ViewChild, TemplateRef, OnDestroy, ViewEncapsulation, ElementRef, NgZone, ChangeDetectorRef, Inject, Renderer2 } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { Observable, of, BehaviorSubject, Subscription, combineLatest } from 'rxjs';
import { filter, map, take, mergeMap, switchMap } from 'rxjs/operators';
import { get, set, find, defaultTo, map as _map, isEmpty, first, join, split, trim } from 'lodash';
import { BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import {
  QuoteService, Quote, Order, OrderService, Note, AttachmentService, CartService, EmailService, Cart,
  AttachmentDetails, ProductInformationService, ItemGroup, LineItemService, AccountService, Contact, ContactService
} from '@congarevenuecloud/ecommerce';
import { ExceptionService, LookupOptions, ToasterPosition, FileOutput } from '@congarevenuecloud/elements';

@Component({
  selector: 'app-quote-details',
  templateUrl: './quote-detail.component.html',
  styleUrls: ['./quote-detail.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class QuoteDetailComponent implements OnInit, OnDestroy {

  quote$: BehaviorSubject<Quote> = new BehaviorSubject<Quote>(null);
  quoteLineItems$: BehaviorSubject<Array<ItemGroup>> = new BehaviorSubject<Array<ItemGroup>>(null);
  attachmentList$: BehaviorSubject<Array<AttachmentDetails>> = new BehaviorSubject<Array<AttachmentDetails>>(null);
  noteList$: BehaviorSubject<Array<Note>> = new BehaviorSubject<Array<Note>>(null);
  order$: Observable<Order>;
  quote: Quote;

  @ViewChild('attachmentSection') attachmentSection: ElementRef;

  note: Note = new Note();

  newlyGeneratedOrder: Order;

  intimationModal: BsModalRef;

  supportedFileTypes: string;

  editLoader = false;

  acceptLoader = false;

  rejectLoader = false;

  commentsLoader = false;

  attachmentsLoader = false;

  finalizeLoader = false;

  quoteConfirmation: Quote;

  notesSubscription: Subscription;

  attachemntSubscription: Subscription;

  quoteSubscription: Subscription[] = [];

  showPresentTemplate = false;

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
  @ViewChild('fileInput') fileInput: ElementRef;


  lookupOptions: LookupOptions = {
    primaryTextField: 'Name',
    secondaryTextField: 'Email',
    fieldList: ['Id', 'Name', 'Email']
  };

  isPrivate: boolean = false;
  maxFileSizeLimit = 29360128;
  cartRecord: Cart = new Cart();
  // Flag used to toggle the content visibility when the list of fields exceeds two rows of the summary with show more or show less icon
  isExpanded: boolean = false;

  constructor(private activatedRoute: ActivatedRoute,
    private quoteService: QuoteService,
    private modalService: BsModalService,
    private orderService: OrderService,
    private accountService: AccountService,
    private contactService: ContactService,
    private exceptionService: ExceptionService,
    private ngZone: NgZone,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private attachmentService: AttachmentService,
    private productInformationService: ProductInformationService,
    private cartService: CartService,
    private emailService: EmailService,
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2

  ) { }

  ngOnInit() {
    this.getQuote();
    this.quoteSubscription.push(this.attachmentService.getSupportedAttachmentType().pipe(
      take(1)
    ).subscribe((data: string) => {
      this.supportedFileTypes = join(_map(split(data, ','), (item) => trim(item)), ', ');
    }))
  }

  getQuote() {
    this.ngOnDestroy();
    this.quoteSubscription.push(this.activatedRoute.params
      .pipe(
        filter(params => get(params, 'id') != null),
        map(params => get(params, 'id')),
        mergeMap(quoteId => this.quoteService.getQuoteById(quoteId)),
        switchMap((quote: Quote) => {
          const quoteLineItems = LineItemService.groupItems(get(quote, 'Items'));
          this.quoteLineItems$.next(quoteLineItems);
          set(this.cartRecord, 'Id', get(get(first(this.quoteLineItems$.value), 'MainLine.Configuration'), 'Id'))
          return combineLatest([isEmpty(quoteLineItems) ? of(null) : (this.cartService.addAdjustmentInfoToLineItems(this.cartRecord?.Id)), of(quote)])
        }),
        take(1),
        switchMap(([lineItems, quote]) => {
          this.cartRecord.LineItems = lineItems;
          this.cartRecord.BusinessObjectType = 'Proposal';
          return this.updateQuoteValue(quote);
        })
      ).subscribe());
    this.getAttachments();
  }

  refreshQuote(fieldValue, quote, fieldName) {
    set(quote, fieldName, fieldValue);
    const quoteItems = get(quote, 'Items');
    const payload = quote.strip(['Owner', 'Items', 'TotalCount', 'ResponseStatus']);
    this.quoteSubscription.push(this.quoteService.updateQuote(quote.Id, payload).pipe(switchMap(c => this.updateQuoteValue(c))).subscribe(r => {
      this.quote = r;
      set(this.quote, 'Items', quoteItems);
    }))
  }

  updateQuoteValue(quote): Observable<Quote> {
    return combineLatest([
      of(quote),
      this.accountService.getCurrentAccount(),
      get(quote.BillToAccount, 'Id') ? this.accountService.getAccount(get(quote.BillToAccount, 'Id')) : of(null),
      get(quote.ShipToAccount, 'Id') ? this.accountService.getAccount(get(quote.ShipToAccount, 'Id')) : of(null),
      get(quote.PrimaryContact, 'Id') ? this.contactService.fetch(get(quote.PrimaryContact, 'Id')) : of(null)

    ]).pipe(map(([quote, accounts, billToAccount, shipToAccount, primaryContact]) => {

      quote.Account = defaultTo(find([accounts], acc => get(acc, 'Id') === get(quote.Account, 'Id')), quote.Account);
      quote.BillToAccount = billToAccount;
      quote.ShipToAccount = shipToAccount;
      quote.PrimaryContact = defaultTo(primaryContact, quote.PrimaryContact) as Contact;;
      set(quote, 'Items', LineItemService.groupItems(get(quote, 'Items')));
      this.order$ = this.orderService.getOrderByQuote(get(quote, 'Id'));
      this.quote = quote;
      return this.quote;
    }))
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

  rejectQuote(quoteId: string) {
    this.rejectLoader = true;
    this.quoteService.rejectQuote(quoteId).pipe(take(1)).subscribe(
      {
        next: () => {
          this.getQuote();
        },
        complete: () => {
          this.rejectLoader = false;
        }
      });
  }

  closeModal() {
    this.intimationModal.hide();
    this.getQuote();
  }

  editQuoteItems(quote: Quote) {
    this.editLoader = true;
    if (!isEmpty(get(quote, 'Items'))) {
      this.showProcessingOverlay();
      this.quoteService.convertQuoteToCart(quote).pipe(take(1)).subscribe(value => {
        set(value, 'Proposald', this.quote);
        this.hideProcessingOverlay();
        this.ngZone.run(() => this.router.navigate(['/carts', 'active']));
      },
        err => {
          this.hideProcessingOverlay();
          this.exceptionService.showError(err);
          this.editLoader = false;
        })
    } else {
      this.addLineItemsToQuote(quote);
    }
  }

  addLineItemsToQuote(quote: Quote) {
    this.editLoader = true;
    this.cartService.createCartFromQuote(quote.Id).pipe(take(1)).subscribe(value => {
      set(value, 'Proposald', this.quote);
      this.ngZone.run(() => this.router.navigate(['/carts', 'active']));
    },
      err => {
        this.exceptionService.showError(err);
        this.editLoader = false;
      })
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
    let obsv$;
    if (get(this.quote, 'ApprovalStage') == 'Draft') {
      const payload = { 'ApprovalStage': 'Generated', 'ProposalName': get(this.quote, 'Name') };
      obsv$ = this.quoteService.updateQuote(this.quote.Id, payload as Quote);
    } else {
      obsv$ = of(null);
    }
    combineLatest([this.emailService.getEmailTemplateByName('DC Quote generate-document Template'), obsv$]).pipe(
      switchMap(result => {
        return first(result) ? this.emailService.sendEmailNotificationWithTemplate(get(first(result), 'Id'), this.quote, get(this.quote.PrimaryContact, 'Id')) : of(null)
      }), take(1)).subscribe(() => {
        this.getQuote();
      });
  }


  getAttachments() {
    if (this.attachemntSubscription) this.attachemntSubscription.unsubscribe();
    this.attachemntSubscription = this.activatedRoute.params
      .pipe(
        switchMap(params => this.attachmentService.getAttachments(get(params, 'id'), 'proposal'))
      ).subscribe((attachments: Array<AttachmentDetails>) => this.ngZone.run(() => this.attachmentList$.next(attachments)));
  }

  deleteAttachment(attachment: AttachmentDetails) {
    attachment.DocumentMetadata.set('deleting', true);
    this.attachmentService.deleteAttachment(attachment.DocumentMetadata.DocumentId).pipe(take(1)).subscribe(() => {
      attachment.DocumentMetadata.set('deleting', false);
      this.getAttachments();
    })
  }

  getFileType(fileType: string): string {
    return fileType.split('/')[1];
  }

  uploadAttachments(fileInput: FileOutput) {
    this.attachmentsLoader = true;
    const fileList = fileInput.files;
    this.isPrivate = fileInput.visibility;
    // To control the visibility of files, pass the additional field "IsPrivate_c" as part of the customProperties when calling uploadMultipleAttachments.
    // You must include "IsPrivate_c" or any other custom fields passed as method parameters to the DocumentMetadata object. For more details, please refer to SDK/product documentation.
    this.attachmentService.uploadMultipleAttachments(fileList, this.quote.Id, 'Proposal', {
      IsPrivate_c: this.isPrivate
    }).pipe(take(1)).subscribe(res => {
      this.getAttachments();
      this.attachmentsLoader = false;
      this.cdr.detectChanges();
    }, err => {
      this.exceptionService.showError(err);
    });
  }

  showPresentTemplateFun() {
    this.showPresentTemplate = true;
  }

  onPresentDoc(obj: any) {
    this.showPresentTemplate = !(obj.onDocumentPage);

    if (obj.isPresentDocCompleted) {
      let obsv$;
      if (get(this.quote, 'ApprovalStage') != 'Presented') {
        const payload = { 'ApprovalStage': 'Presented' };
        obsv$ = this.quoteService.updateQuote(this.quote.Id, payload as Quote);
      } else {
        obsv$ = of(null);
      }
      obsv$.pipe(take(1)).subscribe(() => {
        this.getQuote();
      })
    }
  }

  downloadAttachment(attachmentId: string) {
    this.productInformationService.getAttachmentUrl(attachmentId).pipe(take(1)).subscribe((url: string) => {
      window.open(url, '_blank');
    });
  }

  showProcessingOverlay() {
    const customElement = this.renderer.createElement('div');
    this.renderer.addClass(customElement, 'custom-overlay');
    this.renderer.appendChild(document.body, customElement);
    this.exceptionService.showInfo('COMMON.PROCESSING_MESSAGE', 'COMMON.PROCESSING_TITLE', null, ToasterPosition.BOTTOM_LEFT, 15000, false, false, true, false);
  }

  hideProcessingOverlay() {
    const customElement = document.querySelector('.custom-overlay');
    if (customElement) {
      this.renderer.removeChild(document.body, customElement);
      this.exceptionService.clearToast();
    }
  }

  ngOnDestroy() {
    if (this.notesSubscription)
      this.notesSubscription.unsubscribe();
    if (this.attachemntSubscription)
      this.attachemntSubscription.unsubscribe();
    this.quoteSubscription.forEach(subscription => subscription.unsubscribe());
  }
}

