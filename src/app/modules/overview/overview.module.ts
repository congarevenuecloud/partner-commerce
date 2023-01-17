import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { LaddaModule } from 'angular2-ladda';
import { PricingModule } from '@congarevenuecloud/ecommerce';
import {
  OutputFieldModule,
  PriceModule,
  LineItemTableRowModule,
  BreadcrumbModule,
  PriceSummaryModule,
  ButtonModule,
  InputFieldModule,
  DataFilterModule,
  IconModule,
  AlertModule,
  FilesModule,
  TableModule,
  ChartModule
} from '@congarevenuecloud/elements';
import { ComponentModule } from '../../components/component.module';
import { DetailsModule } from '../details/details.module';
import { OverViewRoutingModule } from './overview-routing.module';
import { OverViewComponent } from './overview/overview.component';
@NgModule({
  declarations: [OverViewComponent],
  imports: [
    CommonModule,
    TableModule,
    ChartModule,
    DetailsModule,
    OutputFieldModule,
    ComponentModule,
    PriceModule,
    LineItemTableRowModule,
    BreadcrumbModule,
    PriceSummaryModule,
    PricingModule,
    TranslateModule.forChild(),
    TooltipModule.forRoot(),
    NgScrollbarModule,
    ButtonModule,
    LaddaModule,
    InputFieldModule,
    DataFilterModule,
    IconModule,
    AlertModule,
    FilesModule,
    OverViewRoutingModule
  ]
})
export class OverViewModule { }
