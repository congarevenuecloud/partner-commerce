import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';
import { ExceptionService } from '@congarevenuecloud/elements';

@Component({
  selector: 'app-login-view',
  template: `
    <div class="container d-flex align-items-center justify-content-center">
    </div>
  `,
  styles: [`
      .container{
          height: 90vh;
      }
    `]
})
export class LoginViewComponent implements OnInit, OnDestroy {

  private subscription: Subscription;

  constructor(private route: ActivatedRoute, private exceptionService: ExceptionService) { }

  ngOnInit() {
    this.subscription = this.route.queryParams.subscribe(params => {
      if (!_.isNil(_.get(params, 'errorMessage'))) {
        this.exceptionService.showError(params['errorMessage']);
      }
    });
  }

  ngOnDestroy() {
    if (!_.isNil(this.subscription))
      this.subscription.unsubscribe();
  }

}
