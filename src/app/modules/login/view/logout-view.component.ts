import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-login-view',
    template: `
    <div class="container d-flex align-items-center justify-content-center">
        <div class="card w-50">
            <div class="card-header"><h5>Logged Out</h5></div>
            <div class="card-body p-5 d-flex flex-column align-items-center">
                <div>You have been logged out</div>
                <button class="btn btn-primary btn-icon" [routerLink]="['/u/login']">
                    <i class="fa fa-arrow-left"></i>
                    Back to Login
                </button>
            </div>
        </div>
    </div>
  `,
    styles: [`
      .container{
          height: 90vh;
      }
    `]
})
export class LogoutViewComponent implements OnInit {

    constructor() { }

    ngOnInit() { }

}
