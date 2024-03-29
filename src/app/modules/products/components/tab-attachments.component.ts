import {
  Input,
  Component,
  ChangeDetectionStrategy,
  OnChanges,
} from '@angular/core';
import { Observable } from 'rxjs';
import {
  Product,
  ProductInformation,
  ProductInformationService,
} from '@congarevenuecloud/ecommerce';
@Component({
  selector: 'app-tab-attachments',
  template: `
    <table class="table table-sm">
      <thead>
        <tr>
          <th scope="col" class="border-top-0">
            {{ 'PRODUCT_DETAILS.FILE_NAME' | translate }}
          </th>
          <th scope="col" class="border-top-0">
            {{ 'PRODUCT_DETAILS.DESCRIPTION' | translate }}
          </th>
          <th scope="col" class="border-top-0">
            {{ 'COMMON.CREATED_DATE' | translate }}
          </th>
          <th scope="col" class="border-top-0">
            {{ 'PRODUCT_DETAILS.INFORMATION_TYPE' | translate }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let attachment of productInformation$ | async">
          <td>
            <a href="javascript:void(0);" (click)="downloadAttachment(attachment)">{{ attachment.Name }}</a>
          </td>
          <td>{{ attachment?.Description }}</td>
          <td>{{ attachment?.CreatedDate | date: 'short' }}</td>
          <td>{{ attachment?.InformationType }}</td>
        </tr>
      </tbody>
    </table>
  `,
  styles: [
    `
      :host {
        font-size: smaller;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class TabAttachmentsComponent implements OnChanges {
  @Input() product: Product;

  productInformation$: Observable<ProductInformation[]>;

  constructor(private productInformationService: ProductInformationService) { }

  ngOnChanges() {
    this.productInformation$ =
      this.productInformationService.getProductInformation(this.product.Id);
  }

  getAttachmentUrl(attachmentId) {
    return this.productInformationService.getAttachmentUrl(attachmentId);
  }

  downloadAttachment(attachmentUrl: string) {
    this.productInformationService.downloadProductAttachment(attachmentUrl);
  }
}
