import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginViewComponent } from './view/login-view.component';
import { LogoutViewComponent } from './view/logout-view.component';


const routes: Routes = [
  {
    path: 'login',
    component: LoginViewComponent
  },
  {
    path: 'logout',
    component: LogoutViewComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LoginRoutingModule { }
