import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfigurationService } from '@congarevenuecloud/core';
import { ProductService, Product, Cart, CartService } from '@congarevenuecloud/ecommerce';
import { ProductDrawerService, BatchSelectionService } from '@congarevenuecloud/elements';
import { get } from 'lodash';

@Component({
  selector: 'app-compare-layout',
  templateUrl: './compare-layout.component.html',
  styleUrls: ['./compare-layout.component.scss']
})
export class CompareLayoutComponent implements OnInit, OnDestroy {
  products: Array<Product>;
  identifiers: Array<string>;
  identifier: string = 'Id';
  cart$: Observable<Cart>;

  constructor(private config: ConfigurationService, private activatedRoute: ActivatedRoute, private cartService: CartService, private router: Router, private productService: ProductService, private batchSelectionService: BatchSelectionService, private productDrawerService: ProductDrawerService) {
    this.identifier = this.config.get('productIdentifier');
  }

  private subs: Array<any> = [];

  ngOnInit() {
    this.activatedRoute.queryParams.subscribe(params => {
      this.cart$ = this.cartService.getMyCart();
      let newIdentifiers = decodeURIComponent(get(params, 'products')).split(',');
      if (newIdentifiers.length > 5) {
        newIdentifiers = newIdentifiers.splice(0, 5);
        this.router.navigateByUrl(`/products/compare?products=${newIdentifiers.join(',')}`);
      }
      else {
        this.subs.push(this.productService.getProducts(null, null, null, null, null, null).pipe(map(res => res.Products)).subscribe(products => {
          const tableProducts = products.filter(product => newIdentifiers.includes(product[this.identifier]));
          this.products = tableProducts;
          this.batchSelectionService.setSelectedProducts(tableProducts);
          if (newIdentifiers.length < 2) this.router.navigateByUrl('/');
          this.identifiers = tableProducts.map(product => product[this.identifier]);
          this.productDrawerService.closeDrawer();
          // Wait for product drawer subscription to fire to close drawer if on the compare page.
          setTimeout(() => {
            this.productDrawerService.closeDrawer();
          }, 0);
        }));
      }
    });
  }

  ngOnDestroy() {
    if (this.subs && this.subs.length > 0) {
      this.subs.forEach(sub => sub.unsubscribe());
    }
  }
}
