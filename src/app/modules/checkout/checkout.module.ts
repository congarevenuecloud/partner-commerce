import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckoutRoutingModule } from './checkout-routing.module';
import { CheckoutComponent } from './layout/checkout.component';
import { SummaryComponent } from './component/summary.component';
import {
  ConfigurationSummaryModule,
  PaymentComponentModule,
  OutputFieldModule,
  MiniProfileModule,
  BreadcrumbModule,
  PriceSummaryModule,
  InputFieldModule
} from '@congarevenuecloud/elements';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { ModalModule } from 'ngx-bootstrap/modal';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { AddressModule, PriceModule, IconModule } from '@congarevenuecloud/elements';
import { TranslateModule } from '@ngx-translate/core';
import { CongaModule } from '@congarevenuecloud/core';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { LaddaModule } from 'angular2-ladda';
import { ComponentModule } from '../../components/component.module';

@NgModule({
  imports: [
    CommonModule,
    CheckoutRoutingModule,
    FormsModule,
    ComponentModule,
    ConfigurationSummaryModule,
    PriceModule,
    IconModule,
    TabsModule.forRoot(),
    ModalModule.forRoot(),
    AddressModule,
    CongaModule,
    PaymentComponentModule,
    OutputFieldModule,
    TooltipModule.forRoot(),
    TranslateModule.forChild(),
    BsDropdownModule.forRoot(),
    MiniProfileModule,
    BreadcrumbModule,
    PriceSummaryModule,
    InputFieldModule,
    LaddaModule
  ],
  declarations: [CheckoutComponent, SummaryComponent]
})
export class CheckoutModule { }
