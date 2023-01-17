import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LaddaModule } from 'angular2-ladda';
import { RouterModule } from '@angular/router';
import { ToastrModule } from 'ngx-toastr';
import { ModalModule } from 'ngx-bootstrap/modal';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { NgScrollbarModule } from 'ngx-scrollbar';
import {
  MiniProfileModule, MiniCartModule, OutputFieldModule, ButtonModule,
  DirectivesModule, ConstraintRuleModule, ProductSearchModule
} from '@congarevenuecloud/elements';
import { HeaderComponent } from './header/header.component';
import { ActionBarComponent } from './action-bar/action-bar.component';
import { CategoryCarouselComponent } from './category-carousel/category-carousel.component';
import { CongaModule } from '@congarevenuecloud/core';
import { ProgressComponent } from './progress/progress.component';

@NgModule({
  imports: [
    CommonModule,
    ModalModule.forRoot(),
    MiniProfileModule,
    MiniCartModule,
    ConstraintRuleModule,
    LaddaModule,
    RouterModule,
    NgScrollbarModule,
    TooltipModule.forRoot(),
    ToastrModule.forRoot({ onActivateTick: true }),
    OutputFieldModule,
    ButtonModule,
    DirectivesModule,
    ProductSearchModule,
    CongaModule
  ],
  exports: [
    HeaderComponent,
    LaddaModule,
    ToastrModule,
    ActionBarComponent,
    ProgressComponent,
    ConstraintRuleModule
  ],
  declarations: [
    HeaderComponent,
    ActionBarComponent,
    CategoryCarouselComponent,
    ProgressComponent
  ]
})
export class ComponentModule { }
