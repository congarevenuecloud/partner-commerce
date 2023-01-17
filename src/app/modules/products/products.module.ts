import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { TranslateModule } from '@ngx-translate/core';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { CongaModule } from '@congarevenuecloud/core';
import { PricingModule } from '@congarevenuecloud/ecommerce';
import {
  IconModule,
  BreadcrumbModule,
  ProductCardModule,
  FilterModule,
  InputFieldModule,
  ButtonModule,
  InputSelectModule,
  ProductCarouselModule,
  ProductConfigurationModule,
  ConfigurationSummaryModule,
  ProductImagesModule,
  PriceModule,
  InputDateModule,
  ConstraintRuleModule,
  AlertModule,
  SelectAllModule
} from '@congarevenuecloud/elements';
import { ComponentModule } from '../../components/component.module';
import { ProductsRoutingModule } from './products-routing.module';
import { DetailsModule } from '../details/details.module';
import { ProductListComponent } from './list/product-list.component';
import { ResultsComponent } from './components/results.component';
import { ProductDetailComponent } from './detail/product-detail.component';
import { TabAttachmentsComponent } from './components/tab-attachments.component';
import { TabFeaturesComponent } from './components/tab-features.component';
@NgModule({
  imports: [
    CommonModule,
    BreadcrumbModule,
    ProductCarouselModule,
    ProductConfigurationModule,
    ConfigurationSummaryModule,
    IconModule,
    ButtonModule,
    ProductImagesModule,
    PriceModule,
    FormsModule,
    ProductsRoutingModule,
    RouterModule,
    ComponentModule,
    PricingModule,
    CongaModule,
    TabsModule.forRoot(),
    InputDateModule,
    TranslateModule.forChild(),
    DetailsModule,
    PaginationModule.forRoot(),
    ProductCardModule,
    InputSelectModule,
    InputFieldModule,
    FilterModule,
    ConstraintRuleModule,
    AlertModule,
    SelectAllModule
  ],
  declarations: [ProductListComponent, ResultsComponent, ProductDetailComponent, TabAttachmentsComponent, TabFeaturesComponent]
})
export class ProductsModule { }
