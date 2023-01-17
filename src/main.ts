import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { from, of } from 'rxjs';
import { switchMap, take, catchError } from 'rxjs/operators';
import { MSAL_INSTANCE, MSAL_GUARD_CONFIG, MSAL_INTERCEPTOR_CONFIG, MsalGuardConfiguration, MsalInterceptorConfiguration } from '@azure/msal-angular';
import { PublicClientApplication, InteractionType, ProtocolMode, BrowserCacheLocation } from '@azure/msal-browser';

import { AuthOptions } from '@congarevenuecloud/core';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

const authConfig: AuthOptions = {
  'authEndpoint': environment.authority,
  'apiEndpoint': environment.endpoint,
  'spaClientId': environment.clientId
}
const configUrl = `${window.location.origin + window.location.pathname}env.json`;

const authOptions$ = from(fetch(configUrl)).pipe(
  switchMap(response => response.json()),
  catchError((err) => of(authConfig))
);

authOptions$.pipe(take(1)).subscribe((authOptions: AuthOptions) => {
  environment.endpoint = authOptions.apiEndpoint;
  platformBrowserDynamic([
    {
      provide: MSAL_INSTANCE, useValue: new PublicClientApplication({
        auth: {
          clientId: authOptions.spaClientId,
          authority: authOptions.authEndpoint,
          redirectUri: window.location.origin + window.location.pathname,
          knownAuthorities: [authOptions.authEndpoint],
          protocolMode: ProtocolMode.OIDC
        },
        cache: {
          cacheLocation: BrowserCacheLocation.LocalStorage,
          storeAuthStateInCookie: false
        },
        system: {
          redirectNavigationTimeout: 3000,
          loggerOptions: {
            loggerCallback: (res) => {
            },
            piiLoggingEnabled: false
          }
        }
      })
    },
    {
      provide: MSAL_GUARD_CONFIG, useValue: {
        interactionType: InteractionType.Redirect // MSAL Guard Configuration
      } as MsalGuardConfiguration
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG, useValue: {
        interactionType: InteractionType.Redirect, // MSAL Guard Configuration
        protectedResourceMap: new Map([
          [authOptions.apiEndpoint, ['openid', 'offline_access']]
        ])
      } as MsalInterceptorConfiguration
    }
  ]).bootstrapModule(AppModule)
    .catch(err => console.error(err));
});
