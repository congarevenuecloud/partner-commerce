import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthorizationGuard } from './auth/auth.guard';
import { MainComponent } from './main.component';
import { environment } from '../environments/environment';
import { RouteInterceptorGuard } from './route-interceptor.guard';

const mainChildrenRoutes: Routes = [
  {
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full'
  },
  {
    path: 'orders',
    loadChildren: () => import('./modules/orders/orders.module').then(m => m.OrdersModule),
  },
  {
    path: 'products',
    loadChildren: () => import('./modules/products/products.module').then(m => m.ProductsModule),
  },
  {
    path: 'carts',
    loadChildren: () => import('./modules/carts/carts.module').then(m => m.CartsModule),
  },
  {
    path: 'search/:query',
    loadChildren: () => import('./modules/products/products.module').then(m => m.ProductsModule),
    data: { title: 'Search' },
  },
  {
    path: 'user',
    loadChildren: () => import('./modules/user/user.module').then(m => m.UserModule),
  },
  {
    path: 'assets',
    loadChildren: () => import('./modules/assets/assets.module').then(m => m.AssetsModule),
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule),
  },
  {
    path: 'proposals',
    loadChildren: () => import('./modules/quotes/quotes.module').then(m => m.QuotesModule),
  },
  {
    path: 'overview',
    loadChildren: () => import('./modules/overview/overview.module').then(m => m.OverViewModule),
  },
  {
    path: 'checkout',
    loadChildren: () => import('./modules/checkout/checkout.module').then(m => m.CheckoutModule),
  },
  {
    path: 'favorites',
    loadChildren: () => import('./modules/favorites/favorites.module').then(m => m.FavoritesModule),
  },
]
@NgModule({
  imports: [
    RouterModule.forRoot([
      {
        path: '',
        component: MainComponent,
        canActivate: [AuthorizationGuard, RouteInterceptorGuard],
        children: mainChildrenRoutes,
      },
      {
        path: ':storefront',
        component: MainComponent,
        canActivate: [AuthorizationGuard, RouteInterceptorGuard],
        children: mainChildrenRoutes,
      },
      {
        path: '**',
        redirectTo: '',
      },
    ],
      {
        useHash: environment.hashRouting,
        scrollPositionRestoration: 'enabled',
      }),
  ],
  exports: [RouterModule],
})

export class AppRoutingModule { }
