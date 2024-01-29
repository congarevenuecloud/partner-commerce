import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LaddaModule } from 'angular2-ladda';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { DatepickerModule, BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { CongaModule } from '@congarevenuecloud/core';
import { PricingModule } from '@congarevenuecloud/ecommerce';
import {
  PriceModule,
  BreadcrumbModule,
  InputFieldModule,
  CaptchaModule,
  AddressModule,
  IconModule,
  LineItemTableRowModule,
  PriceSummaryModule,
  TableModule,
  ChartModule,
  ButtonModule,
  DataFilterModule,
  OutputFieldModule,
  AlertModule,
  QuickAddModule
} from '@congarevenuecloud/elements';
import { DetailsModule } from '../details/details.module';
import { QuotesRoutingModule } from './quotes-routing.module';
import { ComponentModule } from '../../components/component.module';
import { QuoteListComponent } from './list/quote-list.component';
import { QuoteDetailComponent } from './detail/quote-detail.component';
import { CreateQuoteComponent } from './quote-create/create-quote.component';
import { RequestQuoteFormComponent } from './request-quote-form/request-quote-form.component';

@NgModule({
  imports: [
    CommonModule,
    TooltipModule,
    QuotesRoutingModule,
    FormsModule,
    PriceModule,
    PricingModule,
    CaptchaModule,
    DatepickerModule.forRoot(),
    BsDatepickerModule.forRoot(),
    BreadcrumbModule,
    InputFieldModule,
    ButtonModule,
    AddressModule,
    IconModule,
    DetailsModule,
    TranslateModule.forChild(),
    OutputFieldModule,
    LineItemTableRowModule,
    LaddaModule,
    NgScrollbarModule,
    PriceSummaryModule,
    DetailsModule,
    TableModule,
    ChartModule,
    DataFilterModule,
    ComponentModule,
    ButtonModule,
    CongaModule,
    AlertModule,
    QuickAddModule
  ],
  declarations: [QuoteListComponent, QuoteDetailComponent, CreateQuoteComponent, RequestQuoteFormComponent]
})
export class QuotesModule { }