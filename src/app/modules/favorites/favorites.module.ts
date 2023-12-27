import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LaddaModule } from 'angular2-ladda';
import { TranslateModule } from '@ngx-translate/core';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { FavoritesRoutingModule } from './favorites-routing.module';
import { OutputFieldModule, LineItemTableRowModule, TableModule, InputFieldModule, BreadcrumbModule, IconModule, AlertModule } from '@congarevenuecloud/elements';
import { DetailsModule } from '../details/details.module';
import { FavoriteListComponent } from './list/favorite-list/favorite-list.component';
import { FavoriteDetailComponent } from './detail/favorite-detail/favorite-detail.component';

@NgModule({
  declarations: [
    FavoriteListComponent,
    FavoriteDetailComponent
  ],
  imports: [
    CommonModule,
    FavoritesRoutingModule,
    LaddaModule,
    NgScrollbarModule,
    FormsModule,
    TranslateModule.forChild(),
    OutputFieldModule,
    DetailsModule,
    LineItemTableRowModule,
    TableModule,
    BreadcrumbModule,
    InputFieldModule,
    IconModule,
    AlertModule,
  ]
})
export class FavoritesModule { }
