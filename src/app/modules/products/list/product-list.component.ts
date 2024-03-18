import { Component, OnInit, OnDestroy, SecurityContext } from '@angular/core';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { get, isNil, isEmpty, toString, toNumber, set } from 'lodash';
import { Observable, of, BehaviorSubject, Subscription, combineLatest, empty } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { mergeMap } from 'rxjs/operators';
import { FilterOperator } from '@congarevenuecloud/core';
import { Category, ProductService, ProductResult, PreviousState, FieldFilter, AccountService, CategoryService, Product, FacetFilter, FacetFilterPayload } from '@congarevenuecloud/ecommerce';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss']
})
export class ProductListComponent implements OnInit, OnDestroy {

  page = 1;
  pageSize = 12;
  view = 'grid';
  sortField: string = 'Relevance';
  productFamilyFilter: Array<FieldFilter>;
  subCategories: Array<Category> = [];

  searchString: string = null;
  data$: BehaviorSubject<ProductResult> = new BehaviorSubject<ProductResult>(null);
  productFamilies$: Observable<Array<string>> = new Observable<Array<string>>();
  category: Category;
  subscription: Subscription;
  hasSearchError: boolean;
  moveToLast: boolean = false;
  productResult: PreviousState;
  private static VIEW_KEY = 'view';
  private static PAGESIZE_KEY = 'pagesize'
  product = new Product();
  facetFilterPayload: FacetFilterPayload;

  paginationButtonLabels: any = {
    first: '',
    previous: '',
    next: '',
    last: ''
  };

  constructor(private activatedRoute: ActivatedRoute, private sanitizer: DomSanitizer, private router: Router, private categoryService: CategoryService,
    public productService: ProductService, private translateService: TranslateService, private accountService: AccountService) { }

  ngOnDestroy() {
    if (!isNil(this.subscription))
      this.subscription.unsubscribe();
  }

  ngOnInit() {
    this.router.events.subscribe((eventname: NavigationStart) => {
      if (eventname.navigationTrigger === 'popstate' && eventname instanceof NavigationStart) {
        this.productService.eventback.next(true);
      }
    });
    this.accountService.getCurrentAccount().subscribe(() => this.getResults())
    this.productFamilies$ = this.productService.getFieldPickList('Family');

    this.translateService.stream('PAGINATION').subscribe((val: string) => {
      this.paginationButtonLabels.first = val['FIRST'];
      this.paginationButtonLabels.previous = val['PREVIOUS'];
      this.paginationButtonLabels.next = val['NEXT'];
      this.paginationButtonLabels.last = val['LAST'];
    });
  }

  getResults() {
    this.ngOnDestroy();
    this.subscription = this.activatedRoute.params.pipe(
      mergeMap(params => {
        if (this.productService.eventback.value) {
          this.page = this.productService.getState().page;
          this.sortField = this.productService.getState().sort;
        }
        this.view = isNil(ProductService.getValue(ProductListComponent.VIEW_KEY)) ? this.view : ProductService.getValue(ProductListComponent.VIEW_KEY);
        this.pageSize = isNil(ProductService.getValue(ProductListComponent.PAGESIZE_KEY)) ? this.pageSize : toNumber(ProductService.getValue(ProductListComponent.PAGESIZE_KEY));
        this.productResult = { sort: this.sortField, page: this.page }
        this.productService.publish(this.productResult);
        this.data$.next(null);
        this.hasSearchError = false;
        this.searchString = get(params, 'query');
        this.searchString= this.sanitizer.sanitize(
          SecurityContext.HTML,
          this.searchString
        );
        let categories = null;
        const sortBy = this.sortField === 'Name' ? this.sortField : null;
        if (!isNil(get(params, 'categoryId')) && isEmpty(this.subCategories)) {
          this.category = new Category();
          this.category.Id = get(params, 'categoryId');
          categories = [get(params, 'categoryId')];
        } else if (!isEmpty(this.subCategories)) {
          categories = this.subCategories.map(category => category.Id);
        }

        if (get(this.searchString, 'length') < 3) {
          this.hasSearchError = true;
          return of(null);
        } else
          return combineLatest([this.productService.getProducts(categories, this.pageSize, this.page, sortBy, 'ASC', this.searchString, null, null, this.productFamilyFilter, this.facetFilterPayload), this.categoryService.getCategories()]);
      }),
    ).subscribe(([r, categories]) => {
      if (!isEmpty(this.facetFilterPayload)) set(r, 'Facets', this.facetFilterPayload);
      this.data$.next(r);
      if (isNil(categories)) this.category = new Category();
      else if (!this.category || !this.category.Id)
        this.category = null;

      if (this.moveToLast) {
        this.onPage({
          'itemPerPage': this.pageSize,
          'page': this.page + 1
        })
      }
      this.moveToLast = false;
    });
  }

  scrollTop() {
    const c = document.documentElement.scrollTop || document.body.scrollTop;
    if (c > 0) {
      window.requestAnimationFrame(this.scrollTop);
      window.scrollTo(0, c - c / 8);
    }
  }

  onCategory(categoryList: Array<Category>) {
    const category: Category = get(categoryList, '[0]');
    if (category) {
      this.subCategories = [];
      this.page = 1;
      this.router.navigate(['/products/category', category.Id]);
    }
  }

  onPage(evt) {
    if (get(evt, 'page') !== this.page) {
      this.page = evt.page;
      this.getResults();
    }
  }

  onPriceTierChange(evt) {
    this.page = 1;
    this.getResults();
  }

  onSubcategoryFilter(categoryList: Array<Category>) {
    this.subCategories = categoryList;
    this.page = 1;
    this.getResults();
  }

  onFieldFilter(evt) {
    this.page = 1;
    this.getResults();
  }

  onView(evt) {
    this.view = evt;
    ProductService.setValue(ProductListComponent.VIEW_KEY, this.view);
    this.getResults();
  }

  onSortChange(evt) {
    this.page = 1;
    this.sortField = evt;
    this.getResults();
  }

  onPageSizeChange(event) {
    const recordCount = this.data$?.value.TotalCount;
    this.pageSize = event;
    if (this.page * this.pageSize > recordCount) {
      this.page = Math.floor(recordCount / this.pageSize);
      this.moveToLast = (this.page !== 0 && recordCount % this.pageSize !== 0);
      if (this.page === 0) this.page++;
    }
    ProductService.setValue(ProductListComponent.PAGESIZE_KEY, toString(this.pageSize));
    this.getResults();
  }

  handlePicklistChange(event: any) {
    this.productFamilyFilter = null;
    if (event.length > 0) {
      const values = [];
      event.forEach(item => values.push(item));
      this.productFamilyFilter = [{
        field: 'Family',
        value: values,
        filterOperator: values.length > 1 ? FilterOperator.IN : FilterOperator.EQUAL
      }] as Array<FieldFilter>;
    }
    this.getResults();
  }

  getFacetFilterSelection(record: Array<FacetFilter> | FacetFilterPayload) {
    this.facetFilterPayload = (get(record, 'facets') ? record : { facets: record }) as FacetFilterPayload
    this.getResults();
  }
}
