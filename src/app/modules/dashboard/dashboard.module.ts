import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthProviderModule, CongaModule } from '@congarevenuecloud/core';
import { TableModule, BreadcrumbModule, AlertModule } from '@congarevenuecloud/elements';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { ComponentModule } from '../../components/component.module';
import { DashboardViewComponent } from './view/dashboard-view.component';
@NgModule({
  declarations: [DashboardViewComponent],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    AuthProviderModule,
    TableModule,
    CongaModule,
    BreadcrumbModule,
    ComponentModule,
    AlertModule
  ]
})
export class DashboardModule { }
