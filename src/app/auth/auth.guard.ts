import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AutoLoginPartialRoutesGuard } from 'angular-auth-oidc-client';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationGuard {

  constructor(private authService: AuthService, private autoLoginPartialRoutesGuard: AutoLoginPartialRoutesGuard) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    return this.authService.isAuthorized().pipe(
      map(isAuthorized => {
        if (!isAuthorized) {
          this.checkAuth(route, state);
          return false;
        }
        return true;
      })
    );
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    return this.authService.isAuthorized().pipe(
      map(isAuthorized => {
        return this.checkAuth(route, state);
      })
    );
  }

  checkAuth(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): any {
    this.autoLoginPartialRoutesGuard.canActivate(route, state).subscribe(
      (isAuthenticated) => {
        return isAuthenticated;
      }
    );
  }
}
