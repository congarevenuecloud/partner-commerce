import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LaddaModule } from 'angular2-ladda';
import { TranslateModule } from '@ngx-translate/core';
import { DatepickerModule, BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { PricingModule } from '@congarevenuecloud/ecommerce';
import {
  PriceModule,
  InputSelectModule,
  BreadcrumbModule,
  InputFieldModule,
  AddressModule,
  IconModule,
  LineItemTableRowModule,
  PriceSummaryModule,
  TableModule,
  ChartModule,
  ButtonModule,
  DataFilterModule,
  OutputFieldModule
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
    QuotesRoutingModule,
    FormsModule,
    PriceModule,
    PricingModule,
    DatepickerModule.forRoot(),
    BsDatepickerModule.forRoot(),
    InputSelectModule,
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
    ButtonModule
  ],
  declarations: [QuoteListComponent, QuoteDetailComponent,CreateQuoteComponent,  RequestQuoteFormComponent]
})
export class QuotesModule { }