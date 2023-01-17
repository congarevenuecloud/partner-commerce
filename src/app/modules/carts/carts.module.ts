import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { ModalModule } from 'ngx-bootstrap/modal';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { DatepickerModule, BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TranslateModule } from '@ngx-translate/core';
import { LaddaModule } from 'angular2-ladda';
import { CongaModule } from '@congarevenuecloud/core';
import { PricingModule } from '@congarevenuecloud/ecommerce';
import {
  ProductCarouselModule, ConfigurationSummaryModule, PriceModule, PromotionModule, InputDateModule,
  LineItemTableRowModule, BreadcrumbModule, IconModule, PriceSummaryModule, OutputFieldModule,
  InputFieldModule, AlertModule, ConstraintRuleModule, TableModule, ChartModule, SelectAllModule
} from '@congarevenuecloud/elements';
import { ComponentModule } from '../../components/component.module';
import { CartsRoutingModule } from './carts-routing.module';
import { CartDetailComponent } from './detail/cart-detail.component';
import { CartSummaryComponent } from './components/cart-summary/cart-summary.component';
import { CartTableComponent } from './components/cart-table/cart-table.component';
import { CartListComponent } from './list/cart-list.component';
@NgModule({
  declarations: [CartDetailComponent, CartListComponent, CartSummaryComponent, CartTableComponent],
  imports: [
    CongaModule,
    CommonModule,
    CartsRoutingModule,
    PromotionModule,
    ProductCarouselModule,
    PricingModule,
    FormsModule,
    ConfigurationSummaryModule,
    PriceModule,
    PromotionModule,
    ComponentModule,
    TabsModule.forRoot(),
    ModalModule.forRoot(),
    DatepickerModule.forRoot(),
    BsDatepickerModule.forRoot(),
    BsDropdownModule.forRoot(),
    PopoverModule.forRoot(),
    InputDateModule,
    TranslateModule.forChild(),
    LineItemTableRowModule,
    BreadcrumbModule,
    IconModule,
    PriceSummaryModule,
    OutputFieldModule,
    LaddaModule,
    InputFieldModule,
    PaginationModule.forRoot(),
    AlertModule,
    TableModule,
    ChartModule,
    ConstraintRuleModule,
    SelectAllModule
  ]
})
export class CartsModule { }
