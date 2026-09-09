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
  AlertModule,
  CaptchaModule,
  InputFieldModule,
  WizardModule,
  LocationPickerModule
} from '@congarevenuecloud/elements';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { ModalModule } from 'ngx-bootstrap/modal';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { AddressModule, PriceModule, IconModule, TaxBreakupModule, PopoverModule } from '@congarevenuecloud/elements';
import { PopoverModule as BSPopoverModule } from 'ngx-bootstrap/popover';
import { TranslateModule } from '@ngx-translate/core';
import { CongaModule } from '@congarevenuecloud/core';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { LaddaModule } from 'angular2-ladda';
import { ComponentModule } from '../../components/component.module';
import { PricingModule } from '@congarevenuecloud/ecommerce';

@NgModule({
  imports: [
    CommonModule,
    CheckoutRoutingModule,
    FormsModule,
    ComponentModule,
    CaptchaModule,
    ConfigurationSummaryModule,
    PriceModule,
    PricingModule,
    IconModule,
    TabsModule,
    ModalModule,
    AddressModule,
    CongaModule,
    PaymentComponentModule,
    OutputFieldModule,
    TooltipModule,
    PaginationModule,
    TranslateModule.forChild(),
    BsDropdownModule,
    MiniProfileModule,
    BreadcrumbModule,
    PriceSummaryModule,
    InputFieldModule,
    AlertModule,
    LaddaModule,
    WizardModule,
    TaxBreakupModule,
    PopoverModule,
    BSPopoverModule,
    LocationPickerModule
  ],
  declarations: [CheckoutComponent, SummaryComponent]
})
export class CheckoutModule { }
