import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LoginRoutingModule } from './login-routing.module';
import { LoginViewComponent } from './view/login-view.component';
import { LogoutViewComponent } from './view/logout-view.component';


@NgModule({
  declarations: [LoginViewComponent, LogoutViewComponent],
  imports: [
    CommonModule,
    LoginRoutingModule
  ]
})
export class LoginModule { }
