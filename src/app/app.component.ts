import { Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { get } from 'lodash';
import { BatchSelectionService } from '@congarevenuecloud/elements';
@Component({
  selector: 'app-root',
  template: `
    <router-outlet></router-outlet>
    <apt-product-drawer *ngIf="showDrawer$ | async"></apt-product-drawer>
  `,
  styles: [`.container{height: 90vh;}`]
})

export class AppComponent implements OnInit, OnDestroy {

  showDrawer$: Observable<boolean>;
  private readonly _destroying$ = new Subject<void>();

  constructor(private batchSelectionService: BatchSelectionService) { }

  ngOnInit() {
    this.showDrawer$ = combineLatest([
      this.batchSelectionService.getSelectedProducts(),
      this.batchSelectionService.getSelectedLineItems()
    ]).pipe(map(([productList, lineItemList]) => get(productList, 'length', 0) > 0 || get(lineItemList, 'length', 0) > 0));
  }

  ngOnDestroy(): void {
    this._destroying$.next(null);
    this._destroying$.complete();
  }
}
