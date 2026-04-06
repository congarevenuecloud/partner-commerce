import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest, Observable, Subject } from 'rxjs';
import { map, takeUntil, filter } from 'rxjs/operators';
import { get } from 'lodash';
import { BatchSelectionService } from '@congarevenuecloud/elements';
import { DsrService } from './services/dsr.service';
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

   constructor(
    private batchSelectionService: BatchSelectionService, 
    private titleService: Title, 
    private translateService: TranslateService,
    private dsrService: DsrService
  ) { }
  
  ngOnInit() {
    this.setTranslatedTitle();
    this.showDrawer$ = combineLatest([
      this.batchSelectionService.getSelectedProducts(),
      this.batchSelectionService.getSelectedLineItems()
    ]).pipe(map(([productList, lineItemList]) => get(productList, 'length', 0) > 0 || get(lineItemList, 'length', 0) > 0));
  }

  private setTranslatedTitle(): void {
    const isDsrMode$ = this.dsrService.getDsrState().pipe(
      map((state) => state.isDsrMode)
    );

    combineLatest([
      this.translateService.get('APP.TITLE'),
      this.translateService.get('APP.DSR_TITLE'),
      isDsrMode$
    ]).pipe(
      filter(([title, dsrTitle]) => title !== 'APP.TITLE' && dsrTitle !== 'APP.DSR_TITLE'),
      takeUntil(this._destroying$)
    ).subscribe(([title, dsrTitle, isDsrMode]) => {
      const pageTitle = isDsrMode ? dsrTitle as string : title as string;
      this.titleService.setTitle(pageTitle);
    });
  }

  ngOnDestroy(): void {
    this._destroying$.next(null);
    this._destroying$.complete();
  }
}
