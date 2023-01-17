import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LaddaModule } from 'angular2-ladda';
import { TranslateModule } from '@ngx-translate/core';
import { OutputFieldModule, IconModule, AddressModule } from '@congarevenuecloud/elements';
import { UserRoutingModule } from './user-routing.module';
import { SettingsComponent } from './settings/settings.component';
import { ChangePasswordComponent } from './change-password/change-password.component';

@NgModule({
  imports: [
    CommonModule,
    UserRoutingModule,
    TranslateModule.forChild(),
    OutputFieldModule,
    AddressModule,
    FormsModule,
    LaddaModule,
    IconModule
  ],
  declarations: [SettingsComponent, ChangePasswordComponent]
})
export class UserModule { }
