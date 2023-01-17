import { Component, OnChanges, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import * as _ from 'lodash';
import { TranslateService } from '@ngx-translate/core';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'pl-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-2 d-flex align-items-center justify-content-between" *ngIf="recordCount > 0">
      <div>
        {{showRecordsCountMessage}}
        <span class="d-none d-md-inline" *ngIf="query"> for your search of&nbsp;<strong>{{query}}</strong></span>
      </div>

      <div class="d-flex align-items-center">
        <div class="input-group input-group-sm mr-3">
          <div class="input-group-prepend">
            <label class="input-group-text" for="sort">{{'PRODUCT_LIST.SHOW' | translate}}</label>
          </div>
          <select class="custom-select custom-select-sm" id="size" [(ngModel)]="limit" name="limit" (change)="onPageSizeChange.emit($event.target.value)">
          <option *ngFor="let option of pageSizeOptions"
            [attr.value]="option"
            [attr.selected]="option === limit">{{option}}
          </option>
          </select>
        </div>

        <div class="input-group input-group-sm mr-3">
          <div class="input-group-prepend">
            <label class="input-group-text" for="sort">{{'PRODUCT_LIST.SORT_BY' | translate}}</label>
          </div>
          <select class="custom-select custom-select-sm" id="sort" [(ngModel)]="sortBy" name="sortBy" (change)="onSortChange.emit($event.target.value)">
            <option [value]="'Relevance'">{{'PRODUCT_LIST.SORT_BY_RELEVANCE' | translate}}</option>
            <option [value]="'Name'">{{'COMMON.NAME' | translate}}</option>
          </select>
        </div>
        <a href="javascript:void(0)"
            class="btn btn-link btn-sm pb-0 px-0 text-dark"
            [class.disabled]="view == 'grid'"
            [attr.disabled]="view == 'grid'"
            (click)="onViewChange.emit('grid')">
          <i class="fas fa-grip-vertical"></i>
        </a>
        <a href="javascript:void(0)"
            class="btn btn-link btn-sm pb-0 text-dark"
            [class.disabled]="view == 'list'"
            [attr.disabled]="view == 'list'"
            (click)="onViewChange.emit('list')">
          <i class="fas fa-list-ul"></i>
        </a>
      </div>
    </div>
  `,
  styles: [`
    :host{
      font-size: smaller;
    }
    .move-down{
      margin-top: 1px;
    }
  `]
})
export class ResultsComponent implements OnChanges {
  @Input() recordCount: number;
  @Input() limit: number = 12;
  @Input() offset: number = 0;
  @Input() page: number = 1;
  @Input() view: 'grid' | 'list';
  @Input() query: string;
  @Input() sortBy: string;

  @Output() onViewChange: EventEmitter<string> = new EventEmitter<string>();
  @Output() onSortChange: EventEmitter<string> = new EventEmitter<string>();
  @Output() onPageSizeChange: EventEmitter<string> = new EventEmitter<string>();

  showRecordsCountMessage: string = '';

  pageSizeOptions = [4, 12, 20, 50];

  constructor(private translateService: TranslateService) { }

  ngOnChanges() {
    this.prepareRecordsCountMessage();
  }

  get totalRecords(): string {
    if (this.recordCount > 2000)
      return '2000+';
    else if (this.recordCount)
      return this.recordCount.toString();
  }

  get lastResult() {
    return ((this.limit * this.page) >= this.recordCount) ? this.recordCount : (this.limit * this.page);
  }

  prepareRecordsCountMessage() {
    this.translateService.stream('PRODUCT_LIST.SHOW_COUNT_OF_RECORDS_MESSAGE', { minVal: this.recordCount > 0 ? this.offset + 1 : 0, maxVal: this.lastResult, totalVal: this.totalRecords })
      .subscribe((message: string) => {
        this.showRecordsCountMessage = message;
      });
  }
}