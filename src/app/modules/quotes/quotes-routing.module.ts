import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardViewComponent } from '../dashboard/view/dashboard-view.component';
import { QuoteDetailComponent } from './detail/quote-detail.component';
import { QuoteListComponent } from './list/quote-list.component';
import { CreateQuoteComponent } from './quote-create/create-quote.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardViewComponent,
    children: [
      {
        component: QuoteListComponent,
        path: ''
      }
    ]
  },
  {
    path: 'create',
    component: CreateQuoteComponent,
  },
  {
    path: ':id',
    component: QuoteDetailComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class QuotesRoutingModule { }
