import { Component, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { UserService } from '@congarevenuecloud/ecommerce';

const sv = (<any>window).sv;

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent {

  message: string;
  passwordForm: PasswordForm = {} as PasswordForm;
  loading: boolean = false;

  constructor(private userService: UserService, private router: Router, private ngZone: NgZone, private translateService: TranslateService) { }

  setPassword() {
    if (this.passwordForm.passwordA !== this.passwordForm.passwordB) {
      this.translateService.stream('CHANGE_PASSWORD.PASSWORD_DO_NOT_MATCH_ERROR').subscribe((val: string) => {
        this.message = val;
      });
    }
    else {
      this.loading = true;
      this.userService.setPassword(this.passwordForm.passwordA).subscribe(
        res => this.ngZone.run(() => {
          this.loading = false;
          if (sv && sv.params)
            sv.params = null;
          this.router.navigate(['']);
        }),
        err => this.ngZone.run(() => {
          if (err.indexOf('invalid repeated password') >= 0) {
            this.translateService.stream('CHANGE_PASSWORD.OLD_PASSWORD_CAN_NOT_BE_USED_ERROR').subscribe((val: string) => {
              this.message = val;
            });
          }
          else {
            this.translateService.stream('CHANGE_PASSWORD.OCURRED_SERVER_ERROR').subscribe((val: string) => {
              this.message = val;
            });
          }
          this.loading = false;
        })
      );
    }
  }
}

interface PasswordForm {
  passwordA: string;
  passwordB: string;
}