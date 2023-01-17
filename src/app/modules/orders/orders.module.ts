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
  ChartModule,
  AddressModule
} from '@congarevenuecloud/elements';
import { OrdersRoutingModule } from './orders-routing.module';
import { ComponentModule } from '../../components/component.module';
import { DetailsModule } from '../details/details.module';
import { OrderListComponent } from './list/order-list.component';
import { OrderDetailComponent } from './detail/order-detail.component';
@NgModule({
  declarations: [OrderListComponent, OrderDetailComponent],
  imports: [
    CommonModule,
    OrdersRoutingModule,
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
    AddressModule
  ]
})
export class OrdersModule { }